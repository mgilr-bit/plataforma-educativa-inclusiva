// Controlador del CRUD de usuarios. El alta y la baja quedan reservadas al administrador.
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { bcryptRounds } = require('../config/auth');
const {
  toText,
  isValidEmail,
  isValidPassword,
  isValidName,
  toPositiveInteger,
  MIN_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
} = require('../utils/validators');

const ROL_ADMINISTRADOR = 'administrador';
const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 100;

// Columnas publicas: nunca se expone contrasena_hash.
const COLUMNAS_PUBLICAS = `u.id_usuario, u.nombre_completo, u.correo, u.id_rol,
  r.nombre_rol AS rol, u.id_establecimiento, u.estado, u.fecha_registro`;

// Un usuario puede consultarse o modificarse a si mismo; el administrador, a cualquiera.
function puedeAcceder(solicitante, idObjetivo) {
  return solicitante.rol === ROL_ADMINISTRADOR || solicitante.id === idObjetivo;
}

// GET /api/users
async function list(req, res, next) {
  const pagina = toPositiveInteger(req.query.pagina) || 1;
  const limiteSolicitado = toPositiveInteger(req.query.limite) || LIMITE_POR_DEFECTO;
  const limite = Math.min(limiteSolicitado, LIMITE_MAXIMO);
  const desplazamiento = (pagina - 1) * limite;

  // Los filtros se construyen como parametros para evitar inyeccion SQL.
  const condiciones = [];
  const valores = [];

  const rolFiltro = toText(req.query.rol);
  if (rolFiltro) {
    valores.push(rolFiltro);
    condiciones.push(`r.nombre_rol = $${valores.length}`);
  }
  if (req.query.estado === 'true' || req.query.estado === 'false') {
    valores.push(req.query.estado === 'true');
    condiciones.push(`u.estado = $${valores.length}`);
  }
  const buscar = toText(req.query.buscar);
  if (buscar) {
    valores.push(`%${buscar}%`);
    condiciones.push(`(u.nombre_completo ILIKE $${valores.length} OR u.correo ILIKE $${valores.length})`);
  }

  const filtro = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  try {
    const total = await pool.query(
      `SELECT COUNT(*)::int AS total FROM usuario u JOIN rol r ON r.id_rol = u.id_rol ${filtro}`,
      valores
    );

    const resultado = await pool.query(
      `SELECT ${COLUMNAS_PUBLICAS}
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       ${filtro}
       ORDER BY u.id_usuario
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
      usuarios: resultado.rows,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/users/:id
async function getById(req, res, next) {
  const id = toPositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  if (!puedeAcceder(req.user, id)) {
    return res.status(403).json({
      estado: 'error',
      mensaje: 'Solo puede consultar su propio usuario',
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT ${COLUMNAS_PUBLICAS}
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ estado: 'error', mensaje: 'Usuario no encontrado' });
    }

    res.json({ estado: 'ok', usuario: resultado.rows[0] });
  } catch (error) {
    next(error);
  }
}

// POST /api/users
async function create(req, res, next) {
  const { nombreCompleto, correo, contrasena, idRol, idEstablecimiento } = req.body || {};
  const errores = [];

  if (!isValidName(nombreCompleto)) {
    errores.push(`El nombre completo debe tener al menos ${MIN_NAME_LENGTH} caracteres`);
  }
  if (!isValidEmail(correo)) {
    errores.push('El correo no tiene un formato valido');
  }
  if (!isValidPassword(contrasena)) {
    errores.push(`La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  if (!toPositiveInteger(idRol)) {
    errores.push('El identificador de rol es obligatorio');
  }

  if (errores.length > 0) {
    return res.status(400).json({ estado: 'error', mensaje: 'Datos invalidos', errores });
  }

  try {
    const rol = await pool.query('SELECT nombre_rol FROM rol WHERE id_rol = $1', [idRol]);
    if (rol.rowCount === 0) {
      return res.status(400).json({ estado: 'error', mensaje: 'El rol indicado no existe' });
    }

    const hash = await bcrypt.hash(contrasena, bcryptRounds);
    const resultado = await pool.query(
      `INSERT INTO usuario (nombre_completo, correo, contrasena_hash, id_rol, id_establecimiento)
       VALUES ($1, LOWER($2), $3, $4, $5)
       RETURNING id_usuario, nombre_completo, correo, id_rol, id_establecimiento, estado, fecha_registro`,
      [nombreCompleto.trim(), correo.trim(), hash, idRol, idEstablecimiento || null]
    );

    res.status(201).json({
      estado: 'ok',
      usuario: { ...resultado.rows[0], rol: rol.rows[0].nombre_rol },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ estado: 'error', mensaje: 'El correo ya esta registrado' });
    }
    // 23503: el establecimiento indicado no existe.
    if (error.code === '23503') {
      return res.status(400).json({ estado: 'error', mensaje: 'El establecimiento indicado no existe' });
    }
    next(error);
  }
}

// PATCH /api/users/:id
async function update(req, res, next) {
  const id = toPositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  if (!puedeAcceder(req.user, id)) {
    return res.status(403).json({
      estado: 'error',
      mensaje: 'Solo puede modificar su propio usuario',
    });
  }

  const esAdministrador = req.user.rol === ROL_ADMINISTRADOR;
  const { nombreCompleto, correo, contrasena, idRol, idEstablecimiento, estado } = req.body || {};

  // El rol, el establecimiento y el estado solo los cambia el administrador.
  if (!esAdministrador && (idRol !== undefined || estado !== undefined || idEstablecimiento !== undefined)) {
    return res.status(403).json({
      estado: 'error',
      mensaje: 'Solo el administrador puede cambiar el rol, el establecimiento o el estado',
    });
  }

  // Un administrador no puede desactivarse a si mismo: dejaria la plataforma sin acceso.
  if (esAdministrador && estado === false && req.user.id === id) {
    return res.status(409).json({
      estado: 'error',
      mensaje: 'No puede desactivar su propia cuenta de administrador',
    });
  }

  const asignaciones = [];
  const valores = [];
  const errores = [];

  if (nombreCompleto !== undefined) {
    if (!isValidName(nombreCompleto)) {
      errores.push(`El nombre completo debe tener al menos ${MIN_NAME_LENGTH} caracteres`);
    } else {
      valores.push(nombreCompleto.trim());
      asignaciones.push(`nombre_completo = $${valores.length}`);
    }
  }
  if (correo !== undefined) {
    if (!isValidEmail(correo)) {
      errores.push('El correo no tiene un formato valido');
    } else {
      valores.push(correo.trim());
      asignaciones.push(`correo = LOWER($${valores.length})`);
    }
  }
  if (contrasena !== undefined) {
    if (!isValidPassword(contrasena)) {
      errores.push(`La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    } else {
      valores.push(await bcrypt.hash(contrasena, bcryptRounds));
      asignaciones.push(`contrasena_hash = $${valores.length}`);
    }
  }
  if (idRol !== undefined) {
    if (!toPositiveInteger(idRol)) {
      errores.push('El identificador de rol no es valido');
    } else {
      valores.push(idRol);
      asignaciones.push(`id_rol = $${valores.length}`);
    }
  }
  if (idEstablecimiento !== undefined) {
    valores.push(idEstablecimiento === null ? null : toPositiveInteger(idEstablecimiento));
    asignaciones.push(`id_establecimiento = $${valores.length}`);
  }
  if (estado !== undefined) {
    if (typeof estado !== 'boolean') {
      errores.push('El estado debe ser verdadero o falso');
    } else {
      valores.push(estado);
      asignaciones.push(`estado = $${valores.length}`);
    }
  }

  if (errores.length > 0) {
    return res.status(400).json({ estado: 'error', mensaje: 'Datos invalidos', errores });
  }
  if (asignaciones.length === 0) {
    return res.status(400).json({ estado: 'error', mensaje: 'No se indico ningun campo para actualizar' });
  }

  try {
    valores.push(id);
    const resultado = await pool.query(
      `UPDATE usuario SET ${asignaciones.join(', ')}
       WHERE id_usuario = $${valores.length}
       RETURNING id_usuario, nombre_completo, correo, id_rol, id_establecimiento, estado, fecha_registro`,
      valores
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ estado: 'error', mensaje: 'Usuario no encontrado' });
    }

    res.json({ estado: 'ok', usuario: resultado.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ estado: 'error', mensaje: 'El correo ya esta registrado' });
    }
    if (error.code === '23503') {
      return res.status(400).json({ estado: 'error', mensaje: 'El rol o el establecimiento indicado no existe' });
    }
    next(error);
  }
}

// DELETE /api/users/:id
// Baja logica: siete tablas referencian a usuario, por lo que un borrado fisico
// romperia cursos, inscripciones y progreso.
async function deactivate(req, res, next) {
  const id = toPositiveInteger(req.params.id);
  if (!id) {
    return res.status(400).json({ estado: 'error', mensaje: 'El identificador no es valido' });
  }

  if (req.user.id === id) {
    return res.status(409).json({
      estado: 'error',
      mensaje: 'No puede desactivar su propia cuenta',
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE usuario SET estado = FALSE
       WHERE id_usuario = $1
       RETURNING id_usuario, nombre_completo, correo, estado`,
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ estado: 'error', mensaje: 'Usuario no encontrado' });
    }

    res.json({
      estado: 'ok',
      mensaje: 'Usuario desactivado',
      usuario: resultado.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, create, update, deactivate };
