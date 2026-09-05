// Limites de peticiones.
//
// Sin esto, /api/auth/login admite un ataque de fuerza bruta: la API es publica
// y nada impide probar miles de contrasenas.
const rateLimit = require('express-rate-limit');

const VENTANA_MINUTOS = 15;
const VENTANA_MS = VENTANA_MINUTOS * 60 * 1000;

// Intentos de inicio de sesion por ventana. El numero deja margen para que un
// estudiante se equivoque varias veces sin quedar bloqueado, y aun asi corta
// cualquier intento sistematico.
const MAXIMO_INTENTOS_LOGIN = 10;

// Limite general del resto de la API, mas holgado.
const MAXIMO_PETICIONES = 300;

function respuestaExcedida(req, res) {
  res.status(429).json({
    estado: 'error',
    mensaje: `Demasiados intentos. Espere ${VENTANA_MINUTOS} minutos e intente de nuevo.`,
  });
}

// En las pruebas los limites estorban: cada archivo hace decenas de peticiones
// desde la misma direccion y agotaria la cuota. Se evalua en cada peticion, no
// al cargar el modulo, para que una prueba pueda activarlos y comprobarlos.
function desactivado() {
  return process.env.NODE_ENV === 'test';
}

const loginLimiter = rateLimit({
  windowMs: VENTANA_MS,
  limit: MAXIMO_INTENTOS_LOGIN,
  // Solo cuentan los intentos fallidos: quien entra bien no gasta cuota.
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuestaExcedida,
  skip: desactivado,
});

const apiLimiter = rateLimit({
  windowMs: VENTANA_MS,
  limit: MAXIMO_PETICIONES,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: respuestaExcedida,
  skip: desactivado,
});

module.exports = { loginLimiter, apiLimiter, MAXIMO_INTENTOS_LOGIN, VENTANA_MINUTOS };
