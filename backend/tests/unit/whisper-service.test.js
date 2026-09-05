// Pruebas del cliente de Whisper.
//
// Se sustituye fetch por un doble: no se llama nunca al servicio real.
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { transcribeAudio, WhisperError } = require('../../src/services/whisperService');

const fetchOriginal = global.fetch;
const AUDIO = Buffer.from('audio de prueba');

function responder(estado, cuerpo) {
  global.fetch = async () => ({
    ok: estado >= 200 && estado < 300,
    status: estado,
    json: async () => cuerpo,
    text: async () => JSON.stringify(cuerpo),
  });
}

describe('whisperService', () => {
  beforeEach(() => { process.env.OPENAI_API_KEY = 'clave-de-prueba'; });
  afterEach(() => {
    global.fetch = fetchOriginal;
    delete process.env.OPENAI_API_KEY;
  });

  test('sin clave configurada responde 503 y no llama al servicio', async () => {
    delete process.env.OPENAI_API_KEY;
    let llamado = false;
    global.fetch = async () => { llamado = true; };

    await assert.rejects(
      () => transcribeAudio(AUDIO, 'clase.mp3'),
      (error) => error instanceof WhisperError && error.estado === 503
    );
    assert.equal(llamado, false, 'no deberia intentar la llamada');
  });

  test('devuelve el texto y los segmentos con sus tiempos', async () => {
    responder(200, {
      text: '  Hola clase.  ',
      language: 'spanish',
      duration: 5.5,
      segments: [
        { start: 0, end: 2.5, text: ' Hola' },
        { start: 2.5, end: 5.5, text: ' clase.' },
      ],
    });

    const resultado = await transcribeAudio(AUDIO, 'clase.mp3');

    assert.equal(resultado.texto, 'Hola clase.', 'debe venir sin espacios sobrantes');
    assert.equal(resultado.duracionSeg, 5.5);
    assert.deepEqual(resultado.segmentos, [
      { texto: 'Hola', inicio: 0, fin: 2.5 },
      { texto: 'clase.', inicio: 2.5, fin: 5.5 },
    ]);
  });

  test('tolera una respuesta sin segmentos', async () => {
    responder(200, { text: 'Solo texto' });
    const resultado = await transcribeAudio(AUDIO, 'clase.mp3');
    assert.deepEqual(resultado.segmentos, []);
  });

  test('rechaza una respuesta sin el campo text', async () => {
    responder(200, { algo: 'raro' });
    await assert.rejects(() => transcribeAudio(AUDIO, 'clase.mp3'), WhisperError);
  });

  test('traduce el 429 del proveedor sin disfrazarlo de otro error', async () => {
    responder(429, { error: 'rate limit' });
    await assert.rejects(
      () => transcribeAudio(AUDIO, 'clase.mp3'),
      (error) => error.estado === 429
    );
  });

  test('un 401 del proveedor no se propaga como 401 al cliente', async () => {
    responder(401, { error: 'clave invalida' });
    await assert.rejects(
      () => transcribeAudio(AUDIO, 'clase.mp3'),
      // Seria confuso: el estudiante creeria que su sesion caduco.
      (error) => error.estado === 502
    );
  });

  test('un fallo de red responde 502', async () => {
    global.fetch = async () => { throw new Error('ECONNREFUSED'); };
    await assert.rejects(
      () => transcribeAudio(AUDIO, 'clase.mp3'),
      (error) => error.estado === 502
    );
  });

  test('un corte por tiempo responde 504', async () => {
    global.fetch = async () => {
      const error = new Error('abortado');
      error.name = 'AbortError';
      throw error;
    };
    await assert.rejects(
      () => transcribeAudio(AUDIO, 'clase.mp3'),
      (error) => error.estado === 504
    );
  });
});
