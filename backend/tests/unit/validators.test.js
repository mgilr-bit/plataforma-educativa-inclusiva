// Pruebas de las validaciones compartidas.
const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  isValidEmail,
  isValidPassword,
  isValidName,
  toPositiveInteger,
} = require('../../src/utils/validators');

describe('isValidEmail', () => {
  test('acepta correos con formato valido', () => {
    assert.ok(isValidEmail('milton@umg.edu.gt'));
    assert.ok(isValidEmail('  con.espacios@dominio.com  '));
  });

  test('rechaza correos mal formados', () => {
    for (const valor of ['sin-arroba', 'sin@dominio', 'con espacio@x.com', '@x.com', '']) {
      assert.equal(isValidEmail(valor), false, `deberia rechazar: ${valor}`);
    }
  });

  test('rechaza valores que no son cadenas', () => {
    for (const valor of [null, undefined, 42, {}]) {
      assert.equal(isValidEmail(valor), false);
    }
  });
});

describe('isValidPassword', () => {
  test('exige al menos 8 caracteres', () => {
    assert.equal(isValidPassword('1234567'), false);
    assert.ok(isValidPassword('12345678'));
  });

  test('no recorta espacios: forman parte de la contrasena', () => {
    assert.ok(isValidPassword('        '));
  });
});

describe('isValidName', () => {
  test('exige al menos 3 caracteres utiles', () => {
    assert.equal(isValidName('ab'), false);
    assert.equal(isValidName('   a   '), false, 'los espacios no cuentan');
    assert.ok(isValidName('Ana'));
  });
});

describe('toPositiveInteger', () => {
  test('convierte enteros positivos', () => {
    assert.equal(toPositiveInteger(5), 5);
    assert.equal(toPositiveInteger('5'), 5);
  });

  test('rechaza cero, negativos y decimales', () => {
    for (const valor of [0, -1, 1.5, '1.5']) {
      assert.equal(toPositiveInteger(valor), null, `deberia rechazar: ${valor}`);
    }
  });

  test('rechaza lo que no es numero', () => {
    for (const valor of ['abc', '', null, undefined, {}, []]) {
      assert.equal(toPositiveInteger(valor), null);
    }
  });
});
