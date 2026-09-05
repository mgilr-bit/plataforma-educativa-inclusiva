// Prueba de la confianza en el proxy.
//
// De este valor depende que el limite de intentos distinga a un cliente de
// otro. Con el valor equivocado, un solo atacante bloquea a todos los usuarios,
// y el sintoma es indistinguible de un limite que funciona: peticiones
// rechazadas con 429.
const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Confianza en el proxy', () => {
  test('toma el valor de TRUST_PROXY_HOPS', () => {
    process.env.TRUST_PROXY_HOPS = '2';
    delete require.cache[require.resolve('../../src/app')];
    const app = require('../../src/app');

    assert.equal(app.get('trust proxy'), 2);
  });

  test('usa 1 cuando la variable no esta definida', () => {
    delete process.env.TRUST_PROXY_HOPS;
    delete require.cache[require.resolve('../../src/app')];
    const app = require('../../src/app');

    assert.equal(app.get('trust proxy'), 1);
  });

  test('cae al valor por defecto si la variable no es un numero', () => {
    process.env.TRUST_PROXY_HOPS = 'dos';
    delete require.cache[require.resolve('../../src/app')];
    const app = require('../../src/app');

    // Peor que un valor por defecto seria dejar el ajuste en NaN, que Express
    // interpreta como "no confiar en ningun proxy".
    assert.equal(app.get('trust proxy'), 1);
    delete process.env.TRUST_PROXY_HOPS;
  });
});
