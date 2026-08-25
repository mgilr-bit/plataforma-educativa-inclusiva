// Controlador de autenticacion: registro, inicio de sesion y perfil.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { jwtSecret, jwtExpiresIn, bcryptRounds } = require('../config/auth');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
// Hash valido pero imposible de acertar; se usa para igualar tiempos cuando el correo no existe.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Rq7oJ0LhVEcYQ0Bq5X8Yy1qZ2kGa';

// Valida los datos de registro y devuelve la lista de errores encontrados.
function validateRegistration({ nombreCompleto, correo, contrasena, idRol }) {
  const errores = [];

  if (!nombreCompleto || nombreCompleto.trim().length < 3) {
    errores.push('El nombre completo debe tener al menos 3 caracteres');
  }
  if (!correo || !EMAIL_PATTERN.test(correo)) {
    errores.push('El correo no tiene un formato valido');
  }
  if (!contrasena || contrasena.length < MIN_PASSWORD_LENGTH) {
    errores.push(`La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  if (!Number.isInteger(idRol)) {
    errores.push('El identificador de rol es obligatorio');
  }

  return errores;
}

// POST /api/auth/register
async function register(req, res, next) {
  const { nombreCompleto, correo, contrasena, idRol, idEstablecimiento } = req.body || {};
  const errores = validateRegistration({ nombreCompleto, correo, contrasena, idRol });

  if (errores.length > 0) {
    return res.status(400).json({ estado: 'error', mensaje: 'Datos invalidos', errores });
  }

  try {
    // El rol debe existir; evita crear usuarios huerfanos por un id equivocado.
    const rol = await pool.query('SELECT nombre_rol FROM rol WHERE id_rol = $1', [idRol]);
    if (rol.rowCount === 0) {
      return res.status(400).json({ estado: 'error', mensaje: 'El rol indicado no existe' });
    }

    const hash = await bcrypt.hash(contrasena, bcryptRounds);
    const result = await pool.query(
      `INSERT INTO usuario (nombre_completo, correo, contrasena_hash, id_rol, id_establecimiento)
       VALUES ($1, LOWER($2), $3, $4, $5)
       RETURNING id_usuario, nombre_completo, correo, id_rol, estado, fecha_registro`,
      [nombreCompleto.trim(), correo.trim(), hash, idRol, idEstablecimiento || null]
    );

    const usuario = result.rows[0];
    res.status(201).json({
      estado: 'ok',
      usuario: { ...usuario, rol: rol.rows[0].nombre_rol },
    });
  } catch (error) {
    // 23505: violacion de la restriccion UNIQUE sobre el correo.
    if (error.code === '23505') {
      return res.status(409).json({ estado: 'error', mensaje: 'El correo ya esta registrado' });
    }
    next(error);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  const { correo, contrasena } = req.body || {};

  if (!correo || !contrasena) {
    return res.status(400).json({
      estado: 'error',
      mensaje: 'El correo y la contrasena son obligatorios',
    });
  }

  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo, u.contrasena_hash, u.estado, r.nombre_rol
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.correo = LOWER($1)`,
      [correo.trim()]
    );

    const usuario = result.rows[0];
    // Se compara siempre contra un hash para no revelar por tiempo de respuesta si el correo existe.
    const coincide = await bcrypt.compare(
      contrasena,
      usuario ? usuario.contrasena_hash : DUMMY_HASH
    );

    if (!usuario || !coincide) {
      return res.status(401).json({ estado: 'error', mensaje: 'Credenciales invalidas' });
    }

    if (!usuario.estado) {
      return res.status(403).json({ estado: 'error', mensaje: 'La cuenta esta desactivada' });
    }

    const token = jwt.sign(
      { sub: usuario.id_usuario, rol: usuario.nombre_rol },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    res.json({
      estado: 'ok',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_completo: usuario.nombre_completo,
        correo: usuario.correo,
        rol: usuario.nombre_rol,
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/auth/me
async function profile(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT u.id_usuario, u.nombre_completo, u.correo, u.estado, u.fecha_registro,
              r.nombre_rol AS rol
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ estado: 'error', mensaje: 'Usuario no encontrado' });
    }

    res.json({ estado: 'ok', usuario: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, profile };
