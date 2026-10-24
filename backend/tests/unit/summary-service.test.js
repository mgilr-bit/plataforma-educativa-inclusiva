// Pruebas de las instrucciones del resumen.
//
// El prompt es el artefacto de accesibilidad del proyecto: lo que diga ahí es
// lo que el estudiante puede o no puede leer. Estas pruebas lo protegen de
// que alguien lo "limpie" sin saber por qué estaba escrito así.
const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  INSTRUCCIONES, EXIGENCIA, NIVELES, esNivelValido, generarResumen, SummaryError,
} = require('../../src/services/summaryService');

describe('Instrucciones del resumen', () => {
  test('prohíbe los modismos y los dobles sentidos', () => {
    // Para quien tiene el español escrito como segunda lengua, "se le prendió
    // el foco" no es una figura: es una frase que no significa nada.
    assert.match(INSTRUCCIONES, /modismos/i);
    assert.match(INSTRUCCIONES, /metaforas|metáforas/i);
    assert.match(INSTRUCCIONES, /dobles sentidos/i);
  });

  test('prohíbe inventar lo que la clase no dijo', () => {
    // El resumen sustituye a la clase para quien no la oyó. Si añade algo, el
    // estudiante no tiene cómo contrastarlo.
    assert.match(INSTRUCCIONES, /No inventes nada/i);
  });

  test('prohíbe dar por supuesto lo que el estudiante quizá no sabe', () => {
    assert.match(INSTRUCCIONES, /como todos sabemos|obviamente/i);
  });

  test('pide el glosario de palabras nuevas', () => {
    // Definir el vocabulario es la mitad del trabajo: sin eso el resumen es
    // corto pero igual de ilegible.
    assert.match(INSTRUCCIONES, /## Palabras nuevas/);
  });

  test('escribe en español de Guatemala', () => {
    assert.match(INSTRUCCIONES, /espanol de Guatemala|español de Guatemala/i);
  });
});

describe('Niveles de simplificación', () => {
  test('hay uno por cada valor que admite la base', () => {
    // La columna tiene un CHECK con estos tres: un cuarto nivel reventaría al
    // guardar, después de haber pagado la generación.
    assert.deepEqual(NIVELES, ['basico', 'medio', 'avanzado']);
    for (const nivel of NIVELES) {
      assert.ok(EXIGENCIA[nivel], `falta la exigencia del nivel ${nivel}`);
    }
  });

  test('el básico pide oraciones más cortas que el avanzado', () => {
    // Si los niveles no se diferencian en algo medible, son una etiqueta
    // decorativa y el estudiante que lee con dificultad no gana nada.
    assert.match(EXIGENCIA.basico, /ocho palabras o menos/i);
    assert.match(EXIGENCIA.avanzado, /veinticinco palabras/i);
  });

  test('solo se admiten esos tres', () => {
    assert.ok(esNivelValido('basico'));
    assert.ok(!esNivelValido('facilito'));
    assert.ok(!esNivelValido(''));
  });
});

describe('Antes de llamar al modelo', () => {
  test('sin transcripción no se intenta resumir', async () => {
    // Llamar al modelo sin texto gastaría saldo para devolver algo inventado.
    await assert.rejects(
      () => generarResumen({ tituloContenido: 'Clase', transcripcion: '', nivel: 'basico' }),
      (error) => {
        assert.ok(error instanceof SummaryError);
        assert.equal(error.estado, 409);
        assert.match(error.message, /todavia no tiene transcripcion/i);
        return true;
      }
    );
  });

  test('un nivel inventado se rechaza antes de gastar saldo', async () => {
    await assert.rejects(
      () => generarResumen({ tituloContenido: 'Clase', transcripcion: 'Texto', nivel: 'facilito' }),
      (error) => {
        assert.equal(error.estado, 400);
        return true;
      }
    );
  });
});
