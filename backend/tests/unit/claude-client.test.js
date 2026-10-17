// Pruebas de la traducción de errores del asistente.
//
// Lo que llega del servicio son códigos y frases en inglés. Quien las ve es un
// docente en un aula de San Juan Sacatepéquez, y lo que necesita saber es si
// tiene que hacer algo, avisar a alguien o esperar. «El asistente respondió
// con un error (400)» no es ninguna de las tres.
const { test, describe } = require('node:test');
const assert = require('node:assert');
const Anthropic = require('@anthropic-ai/sdk');
const { traducirError } = require('../../src/services/claudeClient');

class ErrorDePrueba extends Error {
  constructor(mensaje, { estado } = {}) {
    super(mensaje);
    this.estado = estado;
  }
}
const crear = (mensaje, opciones) => new ErrorDePrueba(mensaje, opciones);

// Reproduce la forma en la que el SDK entrega un error de la API. El cuarto
// argumento son las cabeceras, y el SDK espera un Headers de verdad: con un
// objeto simple revienta al construirlo.
function errorDeLaApi(status, tipo, mensaje) {
  return new Anthropic.APIError(
    status,
    { type: 'error', error: { type: tipo, message: mensaje } },
    mensaje,
    new Headers()
  );
}

describe('Traducción de errores del asistente', () => {
  test('la falta de saldo se dice con todas sus letras', () => {
    // Es el mensaje literal que devolvió la API al quedarse sin crédito.
    const original = errorDeLaApi(
      400,
      'invalid_request_error',
      'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.'
    );

    const traducido = traducirError(original, crear);

    // Sin esto decía «El asistente respondió con un error (400)», que no dice
    // si hay que recargar, esperar o avisar a alguien.
    assert.match(traducido.message, /saldo/i);
    assert.match(traducido.message, /administrador/i);
    // 503 y no 400: no es culpa de lo que pidió el usuario.
    assert.equal(traducido.estado, 503);
  });

  test('una clave inválida se distingue de la falta de saldo', () => {
    const original = new Anthropic.AuthenticationError(
      401,
      { error: { type: 'authentication_error', message: 'invalid x-api-key' } },
      'no',
      new Headers()
    );

    const traducido = traducirError(original, crear);

    // Son dos problemas distintos y se arreglan de forma distinta.
    assert.match(traducido.message, /clave/i);
    assert.doesNotMatch(traducido.message, /saldo/i);
    assert.equal(traducido.estado, 503);
  });

  test('la saturación invita a reintentar, no a avisar a nadie', () => {
    const original = new Anthropic.RateLimitError(
      429,
      { error: { type: 'rate_limit_error', message: 'rate limit' } },
      'no',
      new Headers()
    );

    const traducido = traducirError(original, crear);

    assert.match(traducido.message, /intente de nuevo/i);
    assert.equal(traducido.estado, 429);
  });

  test('un 400 que no es de saldo no se disfraza de falta de saldo', () => {
    const original = errorDeLaApi(400, 'invalid_request_error', 'max_tokens: must be greater than 0');

    const traducido = traducirError(original, crear);

    // Inventarle una causa al docente lo mandaría a recargar saldo que ya
    // tiene, y el fallo seguiría ahí.
    assert.doesNotMatch(traducido.message, /saldo/i);
    assert.equal(traducido.estado, 502);
  });

  test('lo que no es un error del servicio se devuelve tal cual', () => {
    const propio = new Error('algo nuestro falló');
    assert.equal(traducirError(propio, crear), propio);
  });
});
