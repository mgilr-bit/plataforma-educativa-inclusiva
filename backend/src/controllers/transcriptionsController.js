// Controlador de transcripciones y subtitulos.
//
// La transcripcion se genera con Whisper a partir del audio que sube el docente
// y se guarda junto con sus segmentos, que alimentan los subtitulos.
const pool = require('../config/db');
const { toPositiveInteger } = require('../utils/validators');
const { transcribeAudio, WhisperError } = require('../services/whisperService');

const ROL_ADMINISTRADOR = 'administrador';
const ESTADOS_REVISION = ['pendiente', 'revisada', 'aprobada'];
const LARGO_MAXIMO_SEGMENTO = 500;

// Recupera el contenido con el docente de su curso, para comprobar permisos.
async function buscarContenido(idContenido) {
  const resultado = await pool.query(
    `SELECT c.id_contenido, c.titulo, cu.id_docente, cu.id_curso
     FROM contenido c JOIN curso cu ON cu.id_curso = c.id_curso
     WHERE c.id_contenido = $1`,
    [idContenido]
  );
  return resultado.rows[0] || null;
}

// El estudiante solo accede a los contenidos activos de sus cursos.
async function estudianteTieneAcceso(idEstudiante, idContenido) {
  const resultado = await pool.query(
    `SELECT 1 FROM contenido c
     JOIN inscripcion i ON i.id_curso = c.id_curso
     WHERE c.id_contenido = $1 AND i.id_estudiante = $2 AND c.estado = TRUE`,
    [idContenido, idEstudiante]
  );
  return resultado.rowCount > 0;
}

// Corta un segmento que exceda el largo admitido por la columna.
function recortarSegmento(texto) {
  return texto.length > LARGO_MAXIMO_SEGMENTO ? texto.slice(0, LARGO_MAXIMO_SEGMENTO) : texto;
}

// POST /api/contents/:id/transcription
async function create(req, res, next) {
  const idContenido = toPositiveInteger(req.params.id);
  if (!idContenido) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }
  if (!req.file) {
    return res.status(400).json({
      estado: 'error',
      mensaje: 'Debe adjuntar un archivo de audio en el campo "audio"',
    });
  }

  try {
    const contenido = await buscarContenido(idContenido);
    if (!contenido) {
      return res.status(404).json({ estado: 'error', mensaje: 'Contenido no encontrado' });
    }
    if (req.user.rol !== ROL_ADMINISTRADOR && contenido.id_docente !== req.user.id) {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede transcribir el contenido de los cursos que imparte',
      });
    }

    // La restriccion UNIQUE impide dos transcripciones para el mismo contenido.
    const existente = await pool.query(
      'SELECT id_transcripcion FROM transcripcion WHERE id_contenido = $1',
      [idContenido]
    );
    if (existente.rowCount > 0) {
      return res.status(409).json({
        estado: 'error',
        mensaje: 'Este contenido ya tiene una transcripcion',
        idTranscripcion: existente.rows[0].id_transcripcion,
      });
    }

    const resultado = await transcribeAudio(req.file.buffer, req.file.originalname, {
      idioma: req.body.idioma,
    });

    if (!resultado.texto) {
      return res.status(422).json({
        estado: 'error',
        mensaje: 'El audio no produjo texto; revise que contenga voz audible',
      });
    }

    // Transcripcion y subtitulos se guardan juntos o no se guarda nada.
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');

      const transcripcion = await cliente.query(
        `INSERT INTO transcripcion (id_contenido, texto_completo)
         VALUES ($1, $2)
         RETURNING id_transcripcion, id_contenido, texto_completo, estado_revision, fecha_generacion`,
        [idContenido, resultado.texto]
      );
      const idTranscripcion = transcripcion.rows[0].id_transcripcion;

      for (const segmento of resultado.segmentos) {
        if (!segmento.texto) continue;
        await cliente.query(
          `INSERT INTO subtitulo (id_transcripcion, segmento_texto, tiempo_inicio, tiempo_fin)
           VALUES ($1, $2, $3, $4)`,
          [idTranscripcion, recortarSegmento(segmento.texto), segmento.inicio, segmento.fin]
        );
      }

      await cliente.query('COMMIT');

      res.status(201).json({
        estado: 'ok',
        transcripcion: transcripcion.rows[0],
        subtitulos: resultado.segmentos.length,
        idiomaDetectado: resultado.idioma,
        duracionSeg: resultado.duracionSeg,
      });
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  } catch (error) {
    if (error instanceof WhisperError) {
      return res.status(error.estado).json({ estado: 'error', mensaje: error.message });
    }
    next(error);
  }
}

// GET /api/contents/:id/transcription
async function getByContent(req, res, next) {
  const idContenido = toPositiveInteger(req.params.id);
  if (!idContenido) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  try {
    const contenido = await buscarContenido(idContenido);
    if (!contenido) {
      return res.status(404).json({ estado: 'error', mensaje: 'Contenido no encontrado' });
    }

    if (req.user.rol !== ROL_ADMINISTRADOR) {
      const esDocenteTitular = contenido.id_docente === req.user.id;
      const esEstudianteInscrito = await estudianteTieneAcceso(req.user.id, idContenido);
      if (!esDocenteTitular && !esEstudianteInscrito) {
        // 404, no 403: no se revela la existencia de material ajeno.
        return res.status(404).json({ estado: 'error', mensaje: 'Contenido no encontrado' });
      }
    }

    const transcripcion = await pool.query(
      `SELECT id_transcripcion, id_contenido, texto_completo, precision_estimada,
              estado_revision, fecha_generacion
       FROM transcripcion WHERE id_contenido = $1`,
      [idContenido]
    );

    if (transcripcion.rowCount === 0) {
      return res.status(404).json({
        estado: 'error',
        mensaje: 'Este contenido aun no tiene transcripcion',
      });
    }

    const subtitulos = await pool.query(
      `SELECT id_subtitulo, segmento_texto, tiempo_inicio, tiempo_fin, editado_docente
       FROM subtitulo WHERE id_transcripcion = $1
       ORDER BY tiempo_inicio`,
      [transcripcion.rows[0].id_transcripcion]
    );

    res.json({
      estado: 'ok',
      transcripcion: transcripcion.rows[0],
      subtitulos: subtitulos.rows,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/transcriptions/:id
// El docente corrige el texto y marca el avance de la revision. Importa para la
// accesibilidad: los subtitulos automaticos necesitan repaso humano.
async function update(req, res, next) {
  const id = toPositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  const { textoCompleto, estadoRevision, precisionEstimada } = req.body || {};
  const errores = [];

  if (textoCompleto !== undefined && (typeof textoCompleto !== 'string' || !textoCompleto.trim())) {
    errores.push('El texto de la transcripcion no puede quedar vacio');
  }
  if (estadoRevision !== undefined && !ESTADOS_REVISION.includes(estadoRevision)) {
    errores.push(`El estado de revision debe ser uno de: ${ESTADOS_REVISION.join(', ')}`);
  }
  if (precisionEstimada !== undefined) {
    const valor = Number(precisionEstimada);
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
      errores.push('La precision estimada debe ser un numero entre 0 y 100');
    }
  }
  if (errores.length > 0) {
    return res.status(400).json({ estado: 'error', mensaje: 'Datos invalidos', errores });
  }

  try {
    const duena = await pool.query(
      `SELECT t.id_transcripcion, cu.id_docente
       FROM transcripcion t
       JOIN contenido c ON c.id_contenido = t.id_contenido
       JOIN curso cu ON cu.id_curso = c.id_curso
       WHERE t.id_transcripcion = $1`,
      [id]
    );

    if (duena.rowCount === 0) {
      return res.status(404).json({ estado: 'error', mensaje: 'Transcripcion no encontrada' });
    }
    if (req.user.rol !== ROL_ADMINISTRADOR && duena.rows[0].id_docente !== req.user.id) {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede revisar la transcripcion de los cursos que imparte',
      });
    }

    const asignaciones = [];
    const valores = [];

    if (textoCompleto !== undefined) {
      valores.push(textoCompleto.trim());
      asignaciones.push(`texto_completo = $${valores.length}`);
    }
    if (estadoRevision !== undefined) {
      valores.push(estadoRevision);
      asignaciones.push(`estado_revision = $${valores.length}`);
    }
    if (precisionEstimada !== undefined) {
      valores.push(Number(precisionEstimada));
      asignaciones.push(`precision_estimada = $${valores.length}`);
    }

    if (asignaciones.length === 0) {
      return res.status(400).json({
        estado: 'error',
        mensaje: 'No se indico ningun campo para actualizar',
      });
    }

    valores.push(id);
    const resultado = await pool.query(
      `UPDATE transcripcion SET ${asignaciones.join(', ')}
       WHERE id_transcripcion = $${valores.length}
       RETURNING id_transcripcion, id_contenido, texto_completo, precision_estimada,
                 estado_revision, fecha_generacion`,
      valores
    );

    res.json({ estado: 'ok', transcripcion: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/subtitles/:id
// Corrige un segmento concreto y lo marca como editado por el docente.
async function updateSubtitle(req, res, next) {
  const id = toPositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  const { segmentoTexto, tiempoInicio, tiempoFin } = req.body || {};
  const errores = [];

  if (segmentoTexto !== undefined) {
    if (typeof segmentoTexto !== 'string' || !segmentoTexto.trim()) {
      errores.push('El texto del segmento no puede quedar vacio');
    } else if (segmentoTexto.length > LARGO_MAXIMO_SEGMENTO) {
      errores.push(`El segmento no puede exceder ${LARGO_MAXIMO_SEGMENTO} caracteres`);
    }
  }
  if (tiempoInicio !== undefined && (!Number.isFinite(Number(tiempoInicio)) || Number(tiempoInicio) < 0)) {
    errores.push('El tiempo de inicio debe ser un numero de segundos no negativo');
  }
  if (tiempoFin !== undefined && (!Number.isFinite(Number(tiempoFin)) || Number(tiempoFin) < 0)) {
    errores.push('El tiempo de fin debe ser un numero de segundos no negativo');
  }
  if (errores.length > 0) {
    return res.status(400).json({ estado: 'error', mensaje: 'Datos invalidos', errores });
  }

  try {
    const duena = await pool.query(
      `SELECT s.id_subtitulo, s.tiempo_inicio, s.tiempo_fin, cu.id_docente
       FROM subtitulo s
       JOIN transcripcion t ON t.id_transcripcion = s.id_transcripcion
       JOIN contenido c ON c.id_contenido = t.id_contenido
       JOIN curso cu ON cu.id_curso = c.id_curso
       WHERE s.id_subtitulo = $1`,
      [id]
    );

    if (duena.rowCount === 0) {
      return res.status(404).json({ estado: 'error', mensaje: 'Subtitulo no encontrado' });
    }
    if (req.user.rol !== ROL_ADMINISTRADOR && duena.rows[0].id_docente !== req.user.id) {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede corregir los subtitulos de los cursos que imparte',
      });
    }

    // La tabla exige tiempo_fin >= tiempo_inicio; se valida contra los valores
    // que quedaran tras la actualizacion, no solo contra los recibidos.
    const inicioFinal = tiempoInicio !== undefined ? Number(tiempoInicio) : Number(duena.rows[0].tiempo_inicio);
    const finFinal = tiempoFin !== undefined ? Number(tiempoFin) : Number(duena.rows[0].tiempo_fin);
    if (finFinal < inicioFinal) {
      return res.status(400).json({
        estado: 'error',
        mensaje: 'El tiempo de fin no puede ser anterior al de inicio',
      });
    }

    const asignaciones = ['editado_docente = TRUE'];
    const valores = [];

    if (segmentoTexto !== undefined) {
      valores.push(segmentoTexto.trim());
      asignaciones.push(`segmento_texto = $${valores.length}`);
    }
    if (tiempoInicio !== undefined) {
      valores.push(inicioFinal);
      asignaciones.push(`tiempo_inicio = $${valores.length}`);
    }
    if (tiempoFin !== undefined) {
      valores.push(finFinal);
      asignaciones.push(`tiempo_fin = $${valores.length}`);
    }

    if (valores.length === 0) {
      return res.status(400).json({
        estado: 'error',
        mensaje: 'No se indico ningun campo para actualizar',
      });
    }

    valores.push(id);
    const resultado = await pool.query(
      `UPDATE subtitulo SET ${asignaciones.join(', ')}
       WHERE id_subtitulo = $${valores.length}
       RETURNING id_subtitulo, id_transcripcion, segmento_texto, tiempo_inicio, tiempo_fin, editado_docente`,
      valores
    );

    res.json({ estado: 'ok', subtitulo: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
}

module.exports = { create, getByContent, update, updateSubtitle };
