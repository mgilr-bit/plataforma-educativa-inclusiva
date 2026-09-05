// Controlador de cursos y de sus inscripciones.
//
// Visibilidad segun el rol:
//   administrador -> todos los cursos
//   docente       -> los que imparte
//   estudiante    -> aquellos en los que esta inscrito
const pool = require('../config/db');
const { toPositiveInteger } = require('../utils/validators');

const ROL_ADMINISTRADOR = 'administrador';
const ROL_DOCENTE = 'docente';
const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 100;
const LARGO_MAXIMO_NOMBRE = 100;
const LARGO_MAXIMO_GRADO = 30;
// El ciclo escolar se acota para atajar erratas de captura.
const CICLO_MINIMO = 2000;
const CICLO_MAXIMO = 2100;

const COLUMNAS = `c.id_curso, c.nombre, c.grado, c.ciclo_escolar, c.id_docente,
  u.nombre_completo AS docente`;

// Devuelve la condicion de visibilidad segun el rol, o null si no aplica.
function filtroPorRol(usuario, valores) {
  if (usuario.rol === ROL_ADMINISTRADOR) {
    return null;
  }
  if (usuario.rol === ROL_DOCENTE) {
    valores.push(usuario.id);
    return `c.id_docente = $${valores.length}`;
  }
  valores.push(usuario.id);
  return `EXISTS (
    SELECT 1 FROM inscripcion i
    WHERE i.id_curso = c.id_curso AND i.id_estudiante = $${valores.length}
  )`;
}

// Comprueba que el usuario exista, tenga el rol esperado y este activo.
async function verificarUsuarioConRol(idUsuario, rolEsperado) {
  const resultado = await pool.query(
    `SELECT u.id_usuario, u.estado, r.nombre_rol
     FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = $1`,
    [idUsuario]
  );

  if (resultado.rowCount === 0) {
    return { error: 'inexistente' };
  }
  if (resultado.rows[0].nombre_rol !== rolEsperado) {
    return { error: 'rol_incorrecto' };
  }
  if (!resultado.rows[0].estado) {
    return { error: 'desactivado' };
  }
  return { ok: true };
}

// El administrador administra cualquier curso; el docente, solo los suyos.
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

function validarCampos({ nombre, grado, cicloEscolar, idDocente }, { esCreacion }) {
  const errores = [];

  if (esCreacion || nombre !== undefined) {
    if (typeof nombre !== 'string' || nombre.trim().length === 0) {
      errores.push('El nombre del curso es obligatorio');
    } else if (nombre.trim().length > LARGO_MAXIMO_NOMBRE) {
      errores.push(`El nombre no puede exceder ${LARGO_MAXIMO_NOMBRE} caracteres`);
    }
  }
  if (esCreacion || grado !== undefined) {
    if (typeof grado !== 'string' || grado.trim().length === 0) {
      errores.push('El grado es obligatorio');
    } else if (grado.trim().length > LARGO_MAXIMO_GRADO) {
      errores.push(`El grado no puede exceder ${LARGO_MAXIMO_GRADO} caracteres`);
    }
  }
  if (esCreacion || cicloEscolar !== undefined) {
    const ciclo = toPositiveInteger(cicloEscolar);
    if (!ciclo || ciclo < CICLO_MINIMO || ciclo > CICLO_MAXIMO) {
      errores.push(`El ciclo escolar debe ser un año entre ${CICLO_MINIMO} y ${CICLO_MAXIMO}`);
    }
  }
  if (esCreacion || idDocente !== undefined) {
    if (!toPositiveInteger(idDocente)) {
      errores.push('El identificador del docente es obligatorio');
    }
  }

  return errores;
}

// GET /api/courses
async function list(req, res, next) {
  const pagina = toPositiveInteger(req.query.pagina) || 1;
  const limite = Math.min(toPositiveInteger(req.query.limite) || LIMITE_POR_DEFECTO, LIMITE_MAXIMO);
  const desplazamiento = (pagina - 1) * limite;

  const valores = [];
  const condiciones = [];

  const visibilidad = filtroPorRol(req.user, valores);
  if (visibilidad) {
    condiciones.push(visibilidad);
  }

  if (req.query.docente) {
    const idDocente = toPositiveInteger(req.query.docente);
    if (!idDocente) {
      return res.status(400).json({ estado: 'error', mensaje: 'El docente indicado no es valido' });
    }
    valores.push(idDocente);
    condiciones.push(`c.id_docente = $${valores.length}`);
  }
  if (req.query.ciclo) {
    const ciclo = toPositiveInteger(req.query.ciclo);
    if (!ciclo) {
      return res.status(400).json({ estado: 'error', mensaje: 'El ciclo escolar no es valido' });
    }
    valores.push(ciclo);
    condiciones.push(`c.ciclo_escolar = $${valores.length}`);
  }
  if (req.query.grado) {
    valores.push(`%${req.query.grado.trim()}%`);
    condiciones.push(`c.grado ILIKE $${valores.length}`);
  }
  if (req.query.buscar) {
    valores.push(`%${req.query.buscar.trim()}%`);
    condiciones.push(`c.nombre ILIKE $${valores.length}`);
  }

  const filtro = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const total = await pool.query(
      `SELECT COUNT(*)::int AS total FROM curso c
       JOIN usuario u ON u.id_usuario = c.id_docente ${filtro}`,
      valores
    );

    const resultado = await pool.query(
      `SELECT ${COLUMNAS},
        (SELECT COUNT(*)::int FROM inscripcion i WHERE i.id_curso = c.id_curso) AS inscritos,
        (SELECT COUNT(*)::int FROM contenido co WHERE co.id_curso = c.id_curso AND co.estado) AS contenidos
       FROM curso c
       JOIN usuario u ON u.id_usuario = c.id_docente
       ${filtro}
       ORDER BY c.ciclo_escolar DESC, c.nombre
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
      cursos: resultado.rows,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/courses/:id
async function getById(req, res, next) {
  const id = toPositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  const valores = [id];
  const visibilidad = filtroPorRol(req.user, valores);
  const filtro = visibilidad ? `AND (${visibilidad})` : '';

  try {
    const resultado = await pool.query(
      `SELECT ${COLUMNAS},
        (SELECT COUNT(*)::int FROM inscripcion i WHERE i.id_curso = c.id_curso) AS inscritos,
        (SELECT COUNT(*)::int FROM contenido co WHERE co.id_curso = c.id_curso AND co.estado) AS contenidos
       FROM curso c
       JOIN usuario u ON u.id_usuario = c.id_docente
       WHERE c.id_curso = $1 ${filtro}`,
      valores
    );

    // Igual que en contenidos: 404 tambien cuando existe pero no es visible.
    if (resultado.rowCount === 0) {
      return res.status(404).json({ estado: 'error', mensaje: 'Curso no encontrado' });
    }

    res.json({ estado: 'ok', curso: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
}

// POST /api/courses
async function create(req, res, next) {
  const { nombre, grado, cicloEscolar, idDocente } = req.body || {};
  const errores = validarCampos({ nombre, grado, cicloEscolar, idDocente }, { esCreacion: true });

  if (errores.length > 0) {
    return res.status(400).json({ estado: 'error', mensaje: 'Datos invalidos', errores });
  }

  try {
    const docente = await verificarUsuarioConRol(idDocente, ROL_DOCENTE);
    if (docente.error === 'inexistente') {
      return res.status(400).json({ estado: 'error', mensaje: 'El docente indicado no existe' });
    }
    if (docente.error === 'rol_incorrecto') {
      return res.status(400).json({
        estado: 'error',
        mensaje: 'El usuario indicado no tiene rol de docente',
      });
    }
    if (docente.error === 'desactivado') {
      return res.status(409).json({
        estado: 'error',
        mensaje: 'El docente indicado esta desactivado',
      });
    }

    const resultado = await pool.query(
      `INSERT INTO curso (nombre, grado, ciclo_escolar, id_docente)
       VALUES ($1, $2, $3, $4)
       RETURNING id_curso, nombre, grado, ciclo_escolar, id_docente`,
      [nombre.trim(), grado.trim(), cicloEscolar, idDocente]
    );

    res.status(201).json({ estado: 'ok', curso: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/courses/:id
async function update(req, res, next) {
  const id = toPositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  const { nombre, grado, cicloEscolar, idDocente } = req.body || {};
  const errores = validarCampos({ nombre, grado, cicloEscolar, idDocente }, { esCreacion: false });

  if (errores.length > 0) {
    return res.status(400).json({ estado: 'error', mensaje: 'Datos invalidos', errores });
  }

  // Reasignar el curso a otro docente es potestad del administrador.
  if (idDocente !== undefined && req.user.rol !== ROL_ADMINISTRADOR) {
    return res.status(403).json({
      estado: 'error',
      mensaje: 'Solo el administrador puede reasignar el docente del curso',
    });
  }

  try {
    const permiso = await verificarCursoPropio(req.user, id);
    if (permiso.error === 'inexistente') {
      return res.status(404).json({ estado: 'error', mensaje: 'Curso no encontrado' });
    }
    if (permiso.error === 'ajeno') {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede modificar los cursos que imparte',
      });
    }

    if (idDocente !== undefined) {
      const docente = await verificarUsuarioConRol(idDocente, ROL_DOCENTE);
      if (docente.error === 'inexistente') {
        return res.status(400).json({ estado: 'error', mensaje: 'El docente indicado no existe' });
      }
      if (docente.error === 'rol_incorrecto') {
        return res.status(400).json({
          estado: 'error',
          mensaje: 'El usuario indicado no tiene rol de docente',
        });
      }
      if (docente.error === 'desactivado') {
        return res.status(409).json({
          estado: 'error',
          mensaje: 'El docente indicado esta desactivado',
        });
      }
    }

    const asignaciones = [];
    const valores = [];

    if (nombre !== undefined) {
      valores.push(nombre.trim());
      asignaciones.push(`nombre = $${valores.length}`);
    }
    if (grado !== undefined) {
      valores.push(grado.trim());
      asignaciones.push(`grado = $${valores.length}`);
    }
    if (cicloEscolar !== undefined) {
      valores.push(cicloEscolar);
      asignaciones.push(`ciclo_escolar = $${valores.length}`);
    }
    if (idDocente !== undefined) {
      valores.push(idDocente);
      asignaciones.push(`id_docente = $${valores.length}`);
    }

    if (asignaciones.length === 0) {
      return res.status(400).json({
        estado: 'error',
        mensaje: 'No se indico ningun campo para actualizar',
      });
    }

    valores.push(id);
    const resultado = await pool.query(
      `UPDATE curso SET ${asignaciones.join(', ')}
       WHERE id_curso = $${valores.length}
       RETURNING id_curso, nombre, grado, ciclo_escolar, id_docente`,
      valores
    );

    res.json({ estado: 'ok', curso: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, create, update };
