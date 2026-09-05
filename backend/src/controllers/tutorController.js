// Controlador del asistente educativo.
const pool = require('../config/db');
const { toPositiveInteger } = require('../utils/validators');
const { responderConsulta, TutorError } = require('../services/tutorService');
const { HISTORIAL_MAXIMO } = require('../config/claude');

const ROL_ADMINISTRADOR = 'administrador';
const ROL_DOCENTE = 'docente';
const LARGO_MINIMO_PREGUNTA = 3;
const LARGO_MAXIMO_PREGUNTA = 2000;
const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 100;

// Busca el contenido y su transcripcion, comprobando que el estudiante este
// inscrito en el curso y que el contenido siga activo.
async function obtenerContextoDeContenido(idEstudiante, idContenido) {
  const resultado = await pool.query(
    `SELECT c.id_contenido, c.titulo, t.texto_completo
     FROM contenido c
     JOIN inscripcion i ON i.id_curso = c.id_curso
     LEFT JOIN transcripcion t ON t.id_contenido = c.id_contenido
     WHERE c.id_contenido = $1 AND i.id_estudiante = $2 AND c.estado = TRUE`,
    [idContenido, idEstudiante]
  );
  return resultado.rows[0] || null;
}

// Recupera los ultimos intercambios sobre el mismo contenido para dar
// continuidad a la conversacion.
async function obtenerHistorial(idEstudiante, idContenido) {
  const resultado = await pool.query(
    `SELECT pregunta, respuesta FROM consulta_tutor
     WHERE id_estudiante = $1
       AND (($2::int IS NULL AND id_contenido IS NULL) OR id_contenido = $2)
       AND respuesta IS NOT NULL
     ORDER BY fecha_consulta DESC
     LIMIT $3`,
    [idEstudiante, idContenido, HISTORIAL_MAXIMO]
  );
  // Se devuelven del mas antiguo al mas reciente, que es el orden que espera el modelo.
  return resultado.rows.reverse();
}

// POST /api/tutor/ask
async function ask(req, res, next) {
  const { pregunta, idContenido } = req.body || {};

  if (typeof pregunta !== 'string' || pregunta.trim().length < LARGO_MINIMO_PREGUNTA) {
    return res.status(400).json({
      estado: 'error',
      mensaje: `La pregunta debe tener al menos ${LARGO_MINIMO_PREGUNTA} caracteres`,
    });
  }
  if (pregunta.length > LARGO_MAXIMO_PREGUNTA) {
    return res.status(400).json({
      estado: 'error',
      mensaje: `La pregunta no puede exceder ${LARGO_MAXIMO_PREGUNTA} caracteres`,
    });
  }

  let idContenidoValidado = null;
  if (idContenido !== undefined && idContenido !== null) {
    idContenidoValidado = toPositiveInteger(idContenido);
    if (!idContenidoValidado) {
      return res.status(400).json({
        estado: 'error',
        mensaje: 'El identificador de contenido no es valido',
      });
    }
  }

  try {
    let contexto = null;
    if (idContenidoValidado) {
      contexto = await obtenerContextoDeContenido(req.user.id, idContenidoValidado);
      if (!contexto) {
        // 404 tambien cuando existe pero no le corresponde, igual que en el
        // resto de la API.
        return res.status(404).json({ estado: 'error', mensaje: 'Contenido no encontrado' });
      }
    }

    const historial = await obtenerHistorial(req.user.id, idContenidoValidado);

    const respuesta = await responderConsulta({
      pregunta: pregunta.trim(),
      tituloContenido: contexto ? contexto.titulo : null,
      transcripcion: contexto ? contexto.texto_completo : null,
      historial,
    });

    // La consulta se guarda solo si hubo respuesta: no tiene valor archivar
    // preguntas que nunca se respondieron.
    const guardada = await pool.query(
      `INSERT INTO consulta_tutor (id_estudiante, id_contenido, pregunta, respuesta)
       VALUES ($1, $2, $3, $4)
       RETURNING id_consulta, id_contenido, pregunta, respuesta, fecha_consulta`,
      [req.user.id, idContenidoValidado, pregunta.trim(), respuesta.texto]
    );

    res.status(201).json({
      estado: 'ok',
      consulta: guardada.rows[0],
      contenidoUsado: contexto
        ? { id: contexto.id_contenido, titulo: contexto.titulo, conTranscripcion: Boolean(contexto.texto_completo) }
        : null,
      uso: respuesta.tokens,
    });
  } catch (error) {
    if (error instanceof TutorError) {
      return res.status(error.estado).json({ estado: 'error', mensaje: error.message });
    }
    next(error);
  }
}

// GET /api/tutor/consultations
// El estudiante ve su historial; el docente, el de los contenidos de sus
// cursos; el administrador, todo.
async function list(req, res, next) {
  const pagina = toPositiveInteger(req.query.pagina) || 1;
  const limite = Math.min(toPositiveInteger(req.query.limite) || LIMITE_POR_DEFECTO, LIMITE_MAXIMO);
  const desplazamiento = (pagina - 1) * limite;

  const valores = [];
  const condiciones = [];

  if (req.user.rol === ROL_DOCENTE) {
    valores.push(req.user.id);
    condiciones.push(`cu.id_docente = $${valores.length}`);
  } else if (req.user.rol !== ROL_ADMINISTRADOR) {
    valores.push(req.user.id);
    condiciones.push(`ct.id_estudiante = $${valores.length}`);
  }

  if (req.query.contenido) {
    const idContenido = toPositiveInteger(req.query.contenido);
    if (!idContenido) {
      return res.status(400).json({ estado: 'error', mensaje: 'El contenido indicado no es valido' });
    }
    valores.push(idContenido);
    condiciones.push(`ct.id_contenido = $${valores.length}`);
  }

  const filtro = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const base = `FROM consulta_tutor ct
      LEFT JOIN contenido c ON c.id_contenido = ct.id_contenido
      LEFT JOIN curso cu ON cu.id_curso = c.id_curso
      ${filtro}`;

    const total = await pool.query(`SELECT COUNT(*)::int AS total ${base}`, valores);

    const resultado = await pool.query(
      `SELECT ct.id_consulta, ct.id_estudiante, ct.id_contenido, ct.pregunta,
              ct.respuesta, ct.fecha_consulta, c.titulo AS contenido
       ${base}
       ORDER BY ct.fecha_consulta DESC
       LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
      [...valores, limite, desplazamiento]
    );

    res.json({
      estado: 'ok',
      paginacion: {
        pagina,
        limite,
        total: total.rows[0].total,
        paginas: Math.ceil(total.rows[0].total / limite),
      },
      consultas: resultado.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { ask, list };
