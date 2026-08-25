// Middlewares de autenticacion y autorizacion.
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');

// Verifica el token enviado en la cabecera "Authorization: Bearer <token>"
// y deja los datos del usuario en req.user.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      estado: 'error',
      mensaje: 'Falta el token de autenticacion',
    });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.sub, rol: payload.rol };
    next();
  } catch (error) {
    // Se distingue el token vencido para que el frontend pueda pedir un nuevo inicio de sesion.
    const vencido = error.name === 'TokenExpiredError';
    return res.status(401).json({
      estado: 'error',
      mensaje: vencido ? 'El token ha expirado' : 'Token invalido',
    });
  }
}

// Restringe el acceso a los roles indicados. Se usa despues de authenticate.
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        estado: 'error',
        mensaje: 'Falta el token de autenticacion',
      });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        estado: 'error',
        mensaje: 'No tiene permisos para realizar esta accion',
      });
    }

    next();
  };
}

module.exports = { authenticate, authorize };
