// Controlador de autenticacion: inicio de sesion y consulta del perfil propio.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');

// Hash valido pero imposible de acertar; iguala los tiempos cuando el correo no existe.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Rq7oJ0LhVEcYQ0Bq5X8Yy1qZ2kGa';

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

module.exports = { login, profile };
