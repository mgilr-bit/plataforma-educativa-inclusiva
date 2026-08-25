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

// Convierte a entero positivo o devuelve null si el valor no es utilizable.
function toPositiveInteger(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidName,
  toPositiveInteger,
  MIN_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
};
