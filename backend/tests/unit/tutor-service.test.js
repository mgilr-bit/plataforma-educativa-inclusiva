// Pruebas de las instrucciones del asistente educativo.
//
// El registro del asistente no es un detalle estetico: es el requisito de
// accesibilidad del proyecto. Estas pruebas lo fijan para que un cambio
// descuidado no lo deshaga.
const { test, describe } = require('node:test');
const assert = require('node:assert');
const { INSTRUCCIONES } = require('../../src/services/tutorService');

describe('Instrucciones del asistente', () => {
  test('exigen oraciones cortas y vocabulario sencillo', () => {
    assert.match(INSTRUCCIONES, /oraciones cortas/i);
    assert.match(INSTRUCCIONES, /vocabulario sencillo/i);
  });

  test('prohiben el lenguaje figurado', () => {
    // Es donde se pierde el sentido cuando el espanol escrito es segunda lengua.
    for (const termino of ['modismos', 'refranes', 'metaforas']) {
      assert.match(INSTRUCCIONES, new RegExp(termino, 'i'), `deberia mencionar ${termino}`);
    }
  });

  test('piden definir los terminos tecnicos', () => {
    assert.match(INSTRUCCIONES, /termino tecnico/i);
  });

  test('impiden resolver evaluaciones en lugar del estudiante', () => {
    assert.match(INSTRUCCIONES, /no resuelvas evaluaciones/i);
  });

  test('prohiben inventar contenido que la clase no dijo', () => {
    assert.match(INSTRUCCIONES, /no inventes/i);
  });

  test('estan escritas en espanol', () => {
    assert.match(INSTRUCCIONES, /tutor educativo/i);
    assert.doesNotMatch(INSTRUCCIONES, /You are a helpful/i);
  });
});
