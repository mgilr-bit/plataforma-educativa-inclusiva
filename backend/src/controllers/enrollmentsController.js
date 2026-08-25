// Controlador de inscripciones de estudiantes en cursos.
const pool = require('../config/db');
const { toPositiveInteger } = require('../utils/validators');

const ROL_ADMINISTRADOR = 'administrador';
const ROL_ESTUDIANTE = 'estudiante';

// El administrador administra cualquier curso; el docente, solo los que imparte.
async function verificarCursoPropio(usuario, idCurso) {
  const curso = await pool.query('SELECT id_docente FROM curso WHERE id_curso = $1', [idCurso]);
  if (curso.rowCount === 0) {
    return { error: 'inexistente' };
  }
  if (usuario.rol !== ROL_ADMINISTRADOR && curso.rows[0].id_docente !== usuario.id) {
    return { error: 'ajeno' };
  }
  return { ok: true };
}

// GET /api/courses/:id/enrollments
async function list(req, res, next) {
  const idCurso = toPositiveInteger(req.params.id);
  if (!idCurso) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  try {
    const permiso = await verificarCursoPropio(req.user, idCurso);
    if (permiso.error === 'inexistente') {
      return res.status(404).json({ estado: 'error', mensaje: 'Curso no encontrado' });
    }
    if (permiso.error === 'ajeno') {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede consultar los inscritos de los cursos que imparte',
      });
    }

    const resultado = await pool.query(
      `SELECT i.id_inscripcion, i.fecha_inscripcion,
              u.id_usuario, u.nombre_completo, u.correo, u.estado
       FROM inscripcion i
       JOIN usuario u ON u.id_usuario = i.id_estudiante
       WHERE i.id_curso = $1
       ORDER BY u.nombre_completo`,
      [idCurso]
    );

    res.json({
      estado: 'ok',
      total: resultado.rowCount,
      inscritos: resultado.rows,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/courses/:id/enrollments
async function enroll(req, res, next) {
  const idCurso = toPositiveInteger(req.params.id);
  const idEstudiante = toPositiveInteger((req.body || {}).idEstudiante);

  if (!idCurso) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }
  if (!idEstudiante) {
    return res.status(400).json({
      estado: 'error',
      mensaje: 'El identificador del estudiante es obligatorio',
    });
  }

  try {
    const permiso = await verificarCursoPropio(req.user, idCurso);
    if (permiso.error === 'inexistente') {
      return res.status(404).json({ estado: 'error', mensaje: 'Curso no encontrado' });
    }
    if (permiso.error === 'ajeno') {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede inscribir estudiantes en los cursos que imparte',
      });
    }

    // Solo se inscriben usuarios con rol estudiante y cuenta activa.
    const estudiante = await pool.query(
      `SELECT u.estado, r.nombre_rol
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [idEstudiante]
    );

    if (estudiante.rowCount === 0) {
      return res.status(400).json({ estado: 'error', mensaje: 'El estudiante indicado no existe' });
    }
    if (estudiante.rows[0].nombre_rol !== ROL_ESTUDIANTE) {
      return res.status(400).json({
        estado: 'error',
        mensaje: 'El usuario indicado no tiene rol de estudiante',
      });
    }
    if (!estudiante.rows[0].estado) {
      return res.status(409).json({
        estado: 'error',
        mensaje: 'El estudiante indicado esta desactivado',
      });
    }

    const resultado = await pool.query(
      `INSERT INTO inscripcion (id_estudiante, id_curso)
       VALUES ($1, $2)
       RETURNING id_inscripcion, id_estudiante, id_curso, fecha_inscripcion`,
      [idEstudiante, idCurso]
    );

    res.status(201).json({ estado: 'ok', inscripcion: resultado.rows[0] });
  } catch (error) {
    // 23505: la restriccion UNIQUE (id_estudiante, id_curso) impide duplicar la inscripcion.
    if (error.code === '23505') {
      return res.status(409).json({
        estado: 'error',
        mensaje: 'El estudiante ya esta inscrito en este curso',
      });
    }
    next(error);
  }
}

// DELETE /api/courses/:id/enrollments/:idEstudiante
// El borrado es fisico: ninguna tabla depende de inscripcion, y dar de baja una
// inscripcion equivocada no debe dejar rastro. El progreso del estudiante vive
// en sus propias tablas y no se toca.
async function unenroll(req, res, next) {
  const idCurso = toPositiveInteger(req.params.id);
  const idEstudiante = toPositiveInteger(req.params.idEstudiante);

  if (!idCurso || !idEstudiante) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  try {
    const permiso = await verificarCursoPropio(req.user, idCurso);
    if (permiso.error === 'inexistente') {
      return res.status(404).json({ estado: 'error', mensaje: 'Curso no encontrado' });
    }
    if (permiso.error === 'ajeno') {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede dar de baja estudiantes de los cursos que imparte',
      });
    }

    const resultado = await pool.query(
      `DELETE FROM inscripcion
       WHERE id_curso = $1 AND id_estudiante = $2
       RETURNING id_inscripcion`,
      [idCurso, idEstudiante]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        estado: 'error',
        mensaje: 'El estudiante no esta inscrito en este curso',
      });
    }

    res.json({ estado: 'ok', mensaje: 'Inscripcion dada de baja' });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, enroll, unenroll };
