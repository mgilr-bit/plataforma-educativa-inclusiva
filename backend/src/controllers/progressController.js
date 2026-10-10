// Progreso del estudiante y panel de seguimiento del docente.
//
// El progreso se guarda por material. El avance en el curso es el promedio
// sobre TODOS los materiales activos, contando como cero los que el estudiante
// no ha abierto: si solo promediara lo visitado, quien abrio un material y lo
// termino aparecería al 100 % del curso.
const pool = require('../config/db');
const { toPositiveInteger, toText } = require('../utils/validators');
const { sugerir, SuggestionError } = require('../services/suggestionService');

const ROL_ADMINISTRADOR = 'administrador';

// Comprueba que el curso exista y que quien pregunta pueda verlo.
async function verificarCurso(usuario, idCurso) {
  const curso = await pool.query(
    'SELECT id_curso, nombre, id_docente FROM curso WHERE id_curso = $1',
    [idCurso]
  );
  if (curso.rowCount === 0) return { error: 'inexistente' };
  if (usuario.rol !== ROL_ADMINISTRADOR && curso.rows[0].id_docente !== usuario.id) {
    return { error: 'ajeno' };
  }
  return { curso: curso.rows[0] };
}

// PUT /api/contents/:id/progress
// Lo registra el estudiante al abrir un material y al avanzar en el.
async function guardar(req, res, next) {
  const idContenido = toPositiveInteger(req.params.id);
  if (!idContenido) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  const porcentaje = Number((req.body || {}).porcentaje);
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
    return res.status(400).json({
      estado: 'error',
      mensaje: 'El porcentaje debe ser un numero entre 0 y 100',
    });
  }

  try {
    // Solo se guarda progreso de materiales de cursos en los que esta inscrito.
    const permitido = await pool.query(
      `SELECT 1 FROM contenido c
       JOIN inscripcion i ON i.id_curso = c.id_curso
       WHERE c.id_contenido = $1 AND i.id_estudiante = $2`,
      [idContenido, req.user.id]
    );
    if (permitido.rowCount === 0) {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede registrar avance en los cursos en los que esta inscrito',
      });
    }

    // GREATEST: volver a abrir un material no puede hacer retroceder el avance.
    // Sin eso, abrir una clase ya terminada la devolveria al 1 %.
    const resultado = await pool.query(
      `INSERT INTO progreso (id_estudiante, id_contenido, porcentaje_avance)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_estudiante, id_contenido) DO UPDATE
         SET porcentaje_avance = GREATEST(progreso.porcentaje_avance, EXCLUDED.porcentaje_avance),
             ultima_visita = NOW()
       RETURNING id_progreso, id_contenido, porcentaje_avance, ultima_visita`,
      [req.user.id, idContenido, porcentaje]
    );

    res.json({ estado: 'ok', progreso: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
}

// Arma el filtro de fechas. Se aplica a las consultas y a la ultima visita.
function rangoDeFechas(query) {
  const desde = toText(query.desde);
  const hasta = toText(query.hasta);
  const valido = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f || '');
  return {
    desde: valido(desde) ? desde : null,
    // Se suma un dia para que "hasta" incluya el dia completo y no corte a
    // medianoche del dia anterior.
    hasta: valido(hasta) ? hasta : null,
  };
}

async function recogerSeguimiento(idCurso, { desde, hasta }) {
  const condicionFecha = [];
  const valores = [idCurso];
  if (desde) {
    valores.push(desde);
    condicionFecha.push(`ct.fecha_consulta >= $${valores.length}::date`);
  }
  if (hasta) {
    valores.push(hasta);
    condicionFecha.push(`ct.fecha_consulta < $${valores.length}::date + INTERVAL '1 day'`);
  }
  const filtroConsultas = condicionFecha.length ? `AND ${condicionFecha.join(' AND ')}` : '';

  const estudiantes = await pool.query(
    `WITH materiales AS (
       SELECT id_contenido FROM contenido WHERE id_curso = $1 AND estado = TRUE
     ),
     alumnos AS (
       SELECT u.id_usuario, u.nombre_completo
       FROM inscripcion i
       JOIN usuario u ON u.id_usuario = i.id_estudiante
       WHERE i.id_curso = $1 AND u.estado = TRUE
     )
     SELECT a.id_usuario,
            a.nombre_completo,
            -- Promedio sobre todos los materiales del curso, no solo los
            -- visitados: lo no abierto cuenta como cero.
            COALESCE(ROUND(
              SUM(COALESCE(p.porcentaje_avance, 0))
              / NULLIF((SELECT count(*) FROM materiales), 0)
            ), 0) AS avance,
            MAX(p.ultima_visita) AS ultima_visita,
            (SELECT count(*) FROM consulta_tutor ct
              JOIN contenido c2 ON c2.id_contenido = ct.id_contenido
              WHERE ct.id_estudiante = a.id_usuario
                AND c2.id_curso = $1 ${filtroConsultas}) AS consultas
     FROM alumnos a
     LEFT JOIN progreso p
       ON p.id_estudiante = a.id_usuario
      AND p.id_contenido IN (SELECT id_contenido FROM materiales)
     GROUP BY a.id_usuario, a.nombre_completo
     ORDER BY a.nombre_completo`,
    valores
  );

  const temas = await pool.query(
    `SELECT c.id_contenido, c.titulo, count(*)::int AS consultas
     FROM consulta_tutor ct
     JOIN contenido c ON c.id_contenido = ct.id_contenido
     WHERE c.id_curso = $1 ${filtroConsultas}
     GROUP BY c.id_contenido, c.titulo
     ORDER BY consultas DESC, c.titulo
     LIMIT 8`,
    valores
  );

  const materiales = await pool.query(
    'SELECT count(*)::int AS total FROM contenido WHERE id_curso = $1 AND estado = TRUE',
    [idCurso]
  );

  return {
    estudiantes: estudiantes.rows.map((fila) => ({
      ...fila,
      avance: Number(fila.avance),
      consultas: Number(fila.consultas),
    })),
    temas: temas.rows,
    materiales: materiales.rows[0].total,
  };
}

// GET /api/courses/:id/tracking
async function seguimiento(req, res, next) {
  const idCurso = toPositiveInteger(req.params.id);
  if (!idCurso) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  try {
    const permiso = await verificarCurso(req.user, idCurso);
    if (permiso.error === 'inexistente') {
      return res.status(404).json({ estado: 'error', mensaje: 'Curso no encontrado' });
    }
    if (permiso.error === 'ajeno') {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede ver el seguimiento de los cursos que imparte',
      });
    }

    const rango = rangoDeFechas(req.query);
    const datos = await recogerSeguimiento(idCurso, rango);

    res.json({ estado: 'ok', curso: permiso.curso, rango, ...datos });
  } catch (error) {
    next(error);
  }
}

// Escapa un valor para CSV. Las comillas se duplican y todo valor que lleve
// coma, comilla o salto de linea va entre comillas; sin eso, un titulo con
// coma parte la fila en dos columnas.
function campoCsv(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function fechaLegible(valor) {
  if (!valor) return 'Nunca';
  const f = new Date(valor);
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
}

// GET /api/courses/:id/tracking/export
// Hoja de calculo con lo mismo que muestra el panel.
async function exportar(req, res, next) {
  const idCurso = toPositiveInteger(req.params.id);
  if (!idCurso) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  try {
    const permiso = await verificarCurso(req.user, idCurso);
    if (permiso.error === 'inexistente') {
      return res.status(404).json({ estado: 'error', mensaje: 'Curso no encontrado' });
    }
    if (permiso.error === 'ajeno') {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede exportar el seguimiento de los cursos que imparte',
      });
    }

    const rango = rangoDeFechas(req.query);
    const datos = await recogerSeguimiento(idCurso, rango);

    const lineas = [];
    lineas.push(['Curso', permiso.curso.nombre].map(campoCsv).join(';'));
    lineas.push(['Periodo', `${rango.desde || 'desde el inicio'} a ${rango.hasta || 'hoy'}`].map(campoCsv).join(';'));
    lineas.push(['Materiales publicados', datos.materiales].map(campoCsv).join(';'));
    lineas.push('');
    lineas.push(['Estudiante', 'Avance (%)', 'Ultima visita', 'Consultas al asistente'].map(campoCsv).join(';'));
    for (const e of datos.estudiantes) {
      lineas.push([
        e.nombre_completo, e.avance, fechaLegible(e.ultima_visita), e.consultas,
      ].map(campoCsv).join(';'));
    }
    lineas.push('');
    lineas.push(['Clase', 'Consultas al asistente'].map(campoCsv).join(';'));
    for (const tema of datos.temas) {
      lineas.push([tema.titulo, tema.consultas].map(campoCsv).join(';'));
    }

    // Separador de punto y coma y BOM: asi Excel en configuracion regional de
    // Guatemala abre las columnas bien y respeta los acentos sin pedir nada.
    const csv = `\ufeff${lineas.join('\r\n')}\r\n`;
    const nombre = `seguimiento-${permiso.curso.nombre.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

// POST /api/courses/:id/tracking/suggestion
// Cuesta saldo del asistente, asi que se pide a proposito y no al cargar.
async function sugerencia(req, res, next) {
  const idCurso = toPositiveInteger(req.params.id);
  if (!idCurso) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  try {
    const permiso = await verificarCurso(req.user, idCurso);
    if (permiso.error === 'inexistente') {
      return res.status(404).json({ estado: 'error', mensaje: 'Curso no encontrado' });
    }
    if (permiso.error === 'ajeno') {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede ver el seguimiento de los cursos que imparte',
      });
    }

    const datos = await recogerSeguimiento(idCurso, rangoDeFechas(req.query));
    const resultado = await sugerir({ curso: permiso.curso.nombre, ...datos });

    res.json({ estado: 'ok', sugerencia: resultado.texto });
  } catch (error) {
    if (error instanceof SuggestionError) {
      return res.status(error.estado).json({ estado: 'error', mensaje: error.message });
    }
    next(error);
  }
}

module.exports = {
  guardar, seguimiento, exportar, sugerencia,
  recogerSeguimiento, verificarCurso, rangoDeFechas, campoCsv,
};
