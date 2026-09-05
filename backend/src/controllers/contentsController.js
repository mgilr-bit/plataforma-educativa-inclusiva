// Controlador del CRUD de contenidos educativos.
//
// Visibilidad segun el rol:
//   administrador -> todos los contenidos
//   docente       -> los de los cursos que imparte
//   estudiante    -> los de los cursos en los que esta inscrito, solo activos
const pool = require('../config/db');
const { toText,
  toPositiveInteger } = require('../utils/validators');

const ROL_ADMINISTRADOR = 'administrador';
const ROL_DOCENTE = 'docente';
const TIPOS_VALIDOS = ['video', 'audio', 'documento', 'texto'];
const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 100;
const LARGO_MAXIMO_TITULO = 150;
const LARGO_MAXIMO_URL = 255;

const COLUMNAS = `c.id_contenido, c.id_curso, c.titulo, c.tipo, c.url_archivo,
  c.duracion_seg, c.fecha_carga, c.estado, cu.nombre AS curso, cu.id_docente`;

// Devuelve la condicion de visibilidad y sus valores segun el rol del solicitante.
function filtroPorRol(usuario, valores) {
  if (usuario.rol === ROL_ADMINISTRADOR) {
    return null;
  }
  if (usuario.rol === ROL_DOCENTE) {
    valores.push(usuario.id);
    return `cu.id_docente = $${valores.length}`;
  }
  // Estudiante: solo cursos en los que esta inscrito y contenidos activos.
  valores.push(usuario.id);
  return `c.estado = TRUE AND EXISTS (
    SELECT 1 FROM inscripcion i
    WHERE i.id_curso = c.id_curso AND i.id_estudiante = $${valores.length}
  )`;
}

// Comprueba que el curso exista y que el solicitante pueda administrarlo.
async function verificarCursoPropio(usuario, idCurso) {
  const curso = await pool.query('SELECT id_docente FROM curso WHERE id_curso = $1', [idCurso]);
  if (curso.rowCount === 0) {
    return { error: 'curso_inexistente' };
  }
  if (usuario.rol !== ROL_ADMINISTRADOR && curso.rows[0].id_docente !== usuario.id) {
    return { error: 'ajeno' };
  }
  return { ok: true };
}

// Valida los campos del contenido. En creacion todos los obligatorios deben venir.
function validarCampos(datos, { esCreacion }) {
  const errores = [];
  const { titulo, tipo, urlArchivo, duracionSeg, idCurso } = datos;

  if (esCreacion || titulo !== undefined) {
    if (typeof titulo !== 'string' || titulo.trim().length === 0) {
      errores.push('El titulo es obligatorio');
    } else if (titulo.trim().length > LARGO_MAXIMO_TITULO) {
      errores.push(`El titulo no puede exceder ${LARGO_MAXIMO_TITULO} caracteres`);
    }
  }
  if (esCreacion || tipo !== undefined) {
    if (!TIPOS_VALIDOS.includes(tipo)) {
      errores.push(`El tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`);
    }
  }
  if (esCreacion && !toPositiveInteger(idCurso)) {
    errores.push('El identificador de curso es obligatorio');
  }
  if (urlArchivo !== undefined && urlArchivo !== null) {
    if (typeof urlArchivo !== 'string' || urlArchivo.length > LARGO_MAXIMO_URL) {
      errores.push(`La url del archivo no puede exceder ${LARGO_MAXIMO_URL} caracteres`);
    }
  }
  if (duracionSeg !== undefined && duracionSeg !== null && !toPositiveInteger(duracionSeg)) {
    errores.push('La duracion debe ser un numero entero de segundos mayor que cero');
  }

  return errores;
}

// GET /api/contents
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

  if (req.query.curso) {
    const idCurso = toPositiveInteger(req.query.curso);
    if (!idCurso) {
      return res.status(400).json({ estado: 'error', mensaje: 'El curso indicado no es valido' });
    }
    valores.push(idCurso);
    condiciones.push(`c.id_curso = $${valores.length}`);
  }
  const tipoFiltro = toText(req.query.tipo);
  if (tipoFiltro) {
    if (!TIPOS_VALIDOS.includes(tipoFiltro)) {
      return res.status(400).json({
        estado: 'error',
        mensaje: `El tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`,
      });
    }
    valores.push(tipoFiltro);
    condiciones.push(`c.tipo = $${valores.length}`);
  }
  if (req.query.estado === 'true' || req.query.estado === 'false') {
    valores.push(req.query.estado === 'true');
    condiciones.push(`c.estado = $${valores.length}`);
  }
  const buscar = toText(req.query.buscar);
  if (buscar) {
    valores.push(`%${buscar}%`);
    condiciones.push(`c.titulo ILIKE $${valores.length}`);
  }

  const filtro = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const total = await pool.query(
      `SELECT COUNT(*)::int AS total FROM contenido c
       JOIN curso cu ON cu.id_curso = c.id_curso ${filtro}`,
      valores
    );

    const resultado = await pool.query(
      `SELECT ${COLUMNAS}
       FROM contenido c
       JOIN curso cu ON cu.id_curso = c.id_curso
       ${filtro}
       ORDER BY c.fecha_carga DESC, c.id_contenido DESC
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
      contenidos: resultado.rows,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/contents/:id
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
      `SELECT ${COLUMNAS}
       FROM contenido c
       JOIN curso cu ON cu.id_curso = c.id_curso
       WHERE c.id_contenido = $1 ${filtro}`,
      valores
    );

    // Se responde 404 tanto si no existe como si no es visible, para no revelar
    // la existencia de contenidos de otros cursos.
    if (resultado.rowCount === 0) {
      return res.status(404).json({ estado: 'error', mensaje: 'Contenido no encontrado' });
    }

    res.json({ estado: 'ok', contenido: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
}

// POST /api/contents
async function create(req, res, next) {
  const { idCurso, titulo, tipo, urlArchivo, duracionSeg } = req.body || {};
  const errores = validarCampos({ idCurso, titulo, tipo, urlArchivo, duracionSeg }, { esCreacion: true });

  if (errores.length > 0) {
    return res.status(400).json({ estado: 'error', mensaje: 'Datos invalidos', errores });
  }

  try {
    const permiso = await verificarCursoPropio(req.user, idCurso);
    if (permiso.error === 'curso_inexistente') {
      return res.status(400).json({ estado: 'error', mensaje: 'El curso indicado no existe' });
    }
    if (permiso.error === 'ajeno') {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede cargar contenido en los cursos que imparte',
      });
    }

    const resultado = await pool.query(
      `INSERT INTO contenido (id_curso, titulo, tipo, url_archivo, duracion_seg)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_contenido, id_curso, titulo, tipo, url_archivo, duracion_seg, fecha_carga, estado`,
      [idCurso, titulo.trim(), tipo, urlArchivo || null, duracionSeg || null]
    );

    res.status(201).json({ estado: 'ok', contenido: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
}

// Recupera el contenido junto con el docente del curso, para comprobar permisos.
async function buscarConDueno(id) {
  const resultado = await pool.query(
    `SELECT c.id_contenido, cu.id_docente
     FROM contenido c JOIN curso cu ON cu.id_curso = c.id_curso
     WHERE c.id_contenido = $1`,
    [id]
  );
  return resultado.rows[0] || null;
}

// PATCH /api/contents/:id
async function update(req, res, next) {
  const id = toPositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  const { titulo, tipo, urlArchivo, duracionSeg, estado } = req.body || {};
  const errores = validarCampos({ titulo, tipo, urlArchivo, duracionSeg }, { esCreacion: false });

  if (estado !== undefined && typeof estado !== 'boolean') {
    errores.push('El estado debe ser verdadero o falso');
  }
  if (errores.length > 0) {
    return res.status(400).json({ estado: 'error', mensaje: 'Datos invalidos', errores });
  }

  try {
    const contenido = await buscarConDueno(id);
    if (!contenido) {
      return res.status(404).json({ estado: 'error', mensaje: 'Contenido no encontrado' });
    }
    if (req.user.rol !== ROL_ADMINISTRADOR && contenido.id_docente !== req.user.id) {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede modificar el contenido de los cursos que imparte',
      });
    }

    const asignaciones = [];
    const valores = [];

    if (titulo !== undefined) {
      valores.push(titulo.trim());
      asignaciones.push(`titulo = $${valores.length}`);
    }
    if (tipo !== undefined) {
      valores.push(tipo);
      asignaciones.push(`tipo = $${valores.length}`);
    }
    if (urlArchivo !== undefined) {
      valores.push(urlArchivo);
      asignaciones.push(`url_archivo = $${valores.length}`);
    }
    if (duracionSeg !== undefined) {
      valores.push(duracionSeg);
      asignaciones.push(`duracion_seg = $${valores.length}`);
    }
    if (estado !== undefined) {
      valores.push(estado);
      asignaciones.push(`estado = $${valores.length}`);
    }

    if (asignaciones.length === 0) {
      return res.status(400).json({
        estado: 'error',
        mensaje: 'No se indico ningun campo para actualizar',
      });
    }

    valores.push(id);
    const resultado = await pool.query(
      `UPDATE contenido SET ${asignaciones.join(', ')}
       WHERE id_contenido = $${valores.length}
       RETURNING id_contenido, id_curso, titulo, tipo, url_archivo, duracion_seg, fecha_carga, estado`,
      valores
    );

    res.json({ estado: 'ok', contenido: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/contents/:id
// Baja logica: transcripcion, resumen, progreso y evaluacion dependen del
// contenido con ON DELETE CASCADE, por lo que un borrado fisico perderia el
// historial academico de los estudiantes.
async function deactivate(req, res, next) {
  const id = toPositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  try {
    const contenido = await buscarConDueno(id);
    if (!contenido) {
      return res.status(404).json({ estado: 'error', mensaje: 'Contenido no encontrado' });
    }
    if (req.user.rol !== ROL_ADMINISTRADOR && contenido.id_docente !== req.user.id) {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'Solo puede retirar el contenido de los cursos que imparte',
      });
    }

    const resultado = await pool.query(
      `UPDATE contenido SET estado = FALSE
       WHERE id_contenido = $1
       RETURNING id_contenido, titulo, estado`,
      [id]
    );

    res.json({
      estado: 'ok',
      mensaje: 'Contenido retirado',
      contenido: resultado.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, create, update, deactivate };
