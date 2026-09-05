// Validaciones compartidas por los controladores.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MIN_NAME_LENGTH = 3;

function isValidEmail(correo) {
  return typeof correo === 'string' && EMAIL_PATTERN.test(correo.trim());
}

function isValidPassword(contrasena) {
  return typeof contrasena === 'string' && contrasena.length >= MIN_PASSWORD_LENGTH;
}

function isValidName(nombre) {
  return typeof nombre === 'string' && nombre.trim().length >= MIN_NAME_LENGTH;
}

// Devuelve el valor como texto recortado, o null si no es una cadena.
//
// Hace falta porque no todo lo que llega es texto: un parametro de consulta
// repetido (?buscar=a&buscar=b) llega como arreglo, y un cliente puede enviar
// un objeto donde se espera una cadena. Sin esta comprobacion, llamar a .trim()
// revienta con un 500.
function toText(valor) {
  if (typeof valor !== 'string') {
    return null;
  }
  const recortado = valor.trim();
  return recortado.length > 0 ? recortado : null;
}

// Convierte a entero positivo o devuelve null si el valor no es utilizable.
function toPositiveInteger(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

module.exports = {
  isValidEmail,
  toText,
  isValidPassword,
  isValidName,
  toPositiveInteger,
  MIN_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
};
