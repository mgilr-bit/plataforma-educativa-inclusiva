// Pruebas de la preparacion del audio para Whisper.
//
// La API de transcripcion acepta 25 MB y la plataforma admite 200. Sin este
// paso, el docente graba su clase, la sube, espera, y recibe un error. Es el
// unico punto donde una clase real se diferencia de un audio de demostracion.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const rutaFfmpeg = require('ffmpeg-static');
const {
  prepararParaTranscripcion,
  AudioError,
  leerDuracion,
} = require('../../src/services/audioService');

const ejecutar = promisify(execFile);

let carpeta;
let grandeSinComprimir;

// Ruido seguido de silencio, 40 segundos sin comprimir: unos 7 MB. Se usa
// esto y no un tono puro porque un tono comprime a bitrate constante, y
// entonces calcular el largo de los trozos "a ojo" acertaria siempre. El habla
// real alterna voz y pausas, igual que esta mezcla, y ahi es donde la cuenta
// se queda corta.
before(async () => {
  carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'prueba-audio-'));
  const ruta = path.join(carpeta, 'desigual.wav');
  await ejecutar(rutaFfmpeg, [
    '-y',
    '-f', 'lavfi', '-i', 'anoisesrc=d=20:a=0.8',
    '-f', 'lavfi', '-i', 'anullsrc=d=20',
    '-filter_complex', '[0][1]concat=n=2:v=0:a=1',
    '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le', ruta,
  ]);
  grandeSinComprimir = await fs.readFile(ruta);
});

after(async () => {
  await fs.rm(carpeta, { recursive: true, force: true });
});

describe('Preparación del audio para transcribir', () => {
  test('lo que ya cabe se manda tal cual, sin reprocesar', async () => {
    const pequeno = Buffer.from('finge ser un audio pequeño');

    const partes = await prepararParaTranscripcion(pequeno, 'clase.m4a');

    assert.equal(partes.length, 1);
    // El mismo buffer: recomprimir lo que ya cabe solo gasta tiempo y pierde
    // calidad. Y un archivo intacto llega a Whisper como lo grabó el docente.
    assert.ok(partes[0].buffer.equals(pequeno));
    assert.equal(partes[0].nombre, 'clase.m4a');
    assert.equal(partes[0].desplazamiento, 0);
  });

  test('lo que no cabe se comprime hasta que cabe', async () => {
    const limite = 1024 * 1024;
    assert.ok(grandeSinComprimir.length > limite, 'el audio de prueba debe exceder el límite');

    const partes = await prepararParaTranscripcion(grandeSinComprimir, 'clase.wav', {
      limiteBytes: limite,
    });

    assert.equal(partes.length, 1, 'debe bastar con comprimir, sin partir');
    assert.ok(partes[0].buffer.length <= limite);
    // Cambia de formato, así que el nombre tiene que decirlo: Whisper decide
    // cómo leer el archivo por su extensión.
    assert.equal(partes[0].nombre, 'clase.m4a');
  });

  test('si aun comprimido no cabe, se parte y cada trozo sabe dónde empieza', async () => {
    const limite = 40 * 1024;

    const partes = await prepararParaTranscripcion(grandeSinComprimir, 'clase.wav', {
      limiteBytes: limite,
    });

    assert.ok(partes.length > 1, 'debe partirse en varios trozos');
    for (const parte of partes) {
      // Un trozo un kilobyte por encima lo rechaza la API igual que uno de
      // 40 MB, así que se comprueba el tamaño real de cada uno.
      assert.ok(
        parte.buffer.length <= limite,
        `el trozo ${parte.nombre} pesa ${parte.buffer.length} y el límite es ${limite}`
      );
    }

    // Sin desplazamientos crecientes, los subtítulos del segundo trozo
    // empezarían otra vez en cero y el estudiante vería la clase descuadrada.
    for (let i = 1; i < partes.length; i += 1) {
      assert.ok(
        partes[i].desplazamiento > partes[i - 1].desplazamiento,
        'cada trozo debe empezar después del anterior'
      );
    }
    assert.equal(partes[0].desplazamiento, 0);
  });

  test('un archivo sin pista de audio se explica, no revienta', async () => {
    const noEsAudio = Buffer.alloc(2 * 1024 * 1024, 'x');

    await assert.rejects(
      () => prepararParaTranscripcion(noEsAudio, 'clase.wav', { limiteBytes: 1024 }),
      (error) => {
        assert.ok(error instanceof AudioError);
        assert.equal(error.estado, 422);
        // El docente no sabe qué es un códec; sí sabe si grabó con el
        // micrófono apagado.
        assert.match(error.message, /grabación tenga sonido/i);
        return true;
      }
    );
  });

  test('la duración se lee de la salida de ffmpeg', () => {
    const salida = '  Duration: 00:45:12.34, start: 0.000000, bitrate: 32 kb/s';
    assert.equal(leerDuracion(salida), 45 * 60 + 12.34);
  });

  test('si ffmpeg no informa la duración, no se inventa un número', () => {
    // Devolver 0 haría que el cálculo de los trozos dividiera entre cero.
    assert.equal(leerDuracion('algo que no es una salida de ffmpeg'), null);
  });
});
