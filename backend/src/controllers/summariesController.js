// Controlador de los resumenes en lenguaje sencillo.
const pool = require('../config/db');
const { toPositiveInteger, toText } = require('../utils/validators');
const { generarResumen, SummaryError, NIVELES, esNivelValido } = require('../services/summaryService');

const ROL_ADMINISTRADOR = 'administrador';
const NIVEL_POR_DEFECTO = 'basico';

// Recupera el contenido con su transcripcion y el docente de su curso.
async function buscarContenido(idContenido) {
  const resultado = await pool.query(
    `SELECT c.id_contenido, c.titulo, cu.id_docente, t.texto_completo
     FROM contenido c
     JOIN curso cu ON cu.id_curso = c.id_curso
     LEFT JOIN transcripcion t ON t.id_contenido = c.id_contenido
     WHERE c.id_contenido = $1`,
    [idContenido]
  );
  return resultado.rows[0] || null;
}

function puedeGestionar(usuario, contenido) {
  return usuario.rol === ROL_ADMINISTRADOR || contenido.id_docente === usuario.id;
}

// POST /api/contents/:id/summary
async function create(req, res, next) {
  const idContenido = toPositiveInteger(req.params.id);
  if (!idContenido) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  const nivel = toText((req.body || {}).nivel) || NIVEL_POR_DEFECTO;
  if (!esNivelValido(nivel)) {
    return res.status(400).json({
      estado: 'error',
      mensaje: `El nivel debe ser uno de: ${NIVELES.join(', ')}`,
    });
  }

  try {
    const contenido = await buscarContenido(idContenido);
    if (!contenido) {
      return res.status(404).json({ estado: 'error', mensaje: 'Contenido no encontrado' });
    }
    if (!puedeGestionar(req.user, contenido)) {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede resumir el contenido de los cursos que imparte',
      });
    }

    // Un resumen por nivel: el mismo material puede tener el basico y el
    // avanzado a la vez, para que el estudiante elija el que puede leer.
    const existente = await pool.query(
      'SELECT id_resumen FROM resumen WHERE id_contenido = $1 AND nivel_simplificacion = $2',
      [idContenido, nivel]
    );
    if (existente.rowCount > 0) {
      return res.status(409).json({
        estado: 'error',
        mensaje: 'Este material ya tiene un resumen en ese nivel',
        idResumen: existente.rows[0].id_resumen,
      });
    }

    const generado = await generarResumen({
      tituloContenido: contenido.titulo,
      transcripcion: contenido.texto_completo,
      nivel,
    });

    const guardado = await pool.query(
      `INSERT INTO resumen (id_contenido, texto_resumen, nivel_simplificacion)
       VALUES ($1, $2, $3)
       RETURNING id_resumen, id_contenido, texto_resumen, nivel_simplificacion, fecha_generacion`,
      [idContenido, generado.texto, nivel]
    );

    res.status(201).json({
      estado: 'ok',
      resumen: guardado.rows[0],
      uso: generado.tokens,
    });
  } catch (error) {
    if (error instanceof SummaryError) {
      return res.status(error.estado).json({ estado: 'error', mensaje: error.message });
    }
    next(error);
  }
}

// GET /api/contents/:id/summaries
// Los tres roles pueden leerlos: para el estudiante son la puerta de entrada
// a la clase, mas que la transcripcion completa.
async function list(req, res, next) {
  const idContenido = toPositiveInteger(req.params.id);
  if (!idContenido) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  try {
    const resultado = await pool.query(
      `SELECT id_resumen, id_contenido, texto_resumen, nivel_simplificacion, fecha_generacion
       FROM resumen WHERE id_contenido = $1
       ORDER BY CASE nivel_simplificacion
         WHEN 'basico' THEN 1 WHEN 'medio' THEN 2 ELSE 3 END`,
      [idContenido]
    );
    res.json({ estado: 'ok', resumenes: resultado.rows });
  } catch (error) {
    next(error);
  }
}

// Comprueba que el resumen exista y que el solicitante pueda tocarlo.
async function buscarResumenConDueno(idResumen) {
  const resultado = await pool.query(
    `SELECT r.id_resumen, cu.id_docente
     FROM resumen r
     JOIN contenido c ON c.id_contenido = r.id_contenido
     JOIN curso cu ON cu.id_curso = c.id_curso
     WHERE r.id_resumen = $1`,
    [idResumen]
  );
  return resultado.rows[0] || null;
}

// PATCH /api/summaries/:id
// El resumen lo escribe una maquina y tambien se equivoca. Vale lo mismo que
// con la transcripcion: si nadie puede corregirlo, el error se queda.
async function update(req, res, next) {
  const id = toPositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  const { textoResumen } = req.body || {};
  if (typeof textoResumen !== 'string' || !textoResumen.trim()) {
    return res.status(400).json({
      estado: 'error',
      mensaje: 'El texto del resumen no puede quedar vacio',
    });
  }

  try {
    const resumen = await buscarResumenConDueno(id);
    if (!resumen) {
      return res.status(404).json({ estado: 'error', mensaje: 'Resumen no encontrado' });
    }
    if (req.user.rol !== ROL_ADMINISTRADOR && resumen.id_docente !== req.user.id) {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede corregir el resumen de los cursos que imparte',
      });
    }

    const resultado = await pool.query(
      `UPDATE resumen SET texto_resumen = $1 WHERE id_resumen = $2
       RETURNING id_resumen, id_contenido, texto_resumen, nivel_simplificacion, fecha_generacion`,
      [textoResumen.trim(), id]
    );
    res.json({ estado: 'ok', resumen: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/summaries/:id
// Se borra de verdad: a diferencia del contenido, nada depende de un resumen,
// y dejarlo marcado solo impediria generar otro en el mismo nivel.
async function remove(req, res, next) {
  const id = toPositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  try {
    const resumen = await buscarResumenConDueno(id);
    if (!resumen) {
      return res.status(404).json({ estado: 'error', mensaje: 'Resumen no encontrado' });
    }
    if (req.user.rol !== ROL_ADMINISTRADOR && resumen.id_docente !== req.user.id) {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede borrar el resumen de los cursos que imparte',
      });
    }

    await pool.query('DELETE FROM resumen WHERE id_resumen = $1', [id]);
    res.json({ estado: 'ok', mensaje: 'Resumen borrado' });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, list, update, remove };
