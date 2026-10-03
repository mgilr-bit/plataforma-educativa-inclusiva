// Prepara el audio de una clase para que Whisper pueda transcribirlo.
//
// La API de OpenAI acepta archivos de hasta 25 MB. La plataforma admite hasta
// 200 MB porque una clase grabada en video pesa mucho mas, de modo que sin
// este paso el docente sube la clase, pulsa "Generar transcripcion" y recibe
// un error del servidor despues de esperar.
//
// Lo que se hace, en orden:
//   1. Si ya cabe, se manda tal cual. No se reprocesa lo que no hace falta.
//   2. Si no cabe, se extrae solo la voz: un canal, 32 kbps. Eso son unos
//      14 MB por hora, asi que una clase normal entra de sobra. El video se
//      descarta entero, que es de donde viene casi todo el peso.
//   3. Si aun asi no cabe (clases de mas de hora y media), se parte en trozos
//      y cada uno lleva su desplazamiento, para que los subtitulos del segundo
//      trozo no empiecen otra vez en cero.
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const rutaFfmpeg = require('ffmpeg-static');

const ejecutar = promisify(execFile);

// Se deja margen bajo los 25 MB de la API: el limite es del cuerpo completo de
// la peticion, que lleva ademas las cabeceras del formulario.
const LIMITE_BYTES = 24 * 1024 * 1024;

// Voz hablada en un canal. Mas calidad no mejora lo que Whisper entiende, y
// cada megabyte de mas acerca el archivo al limite.
const BITRATE = '32k';
const SEGUNDOS_POR_TROZO_MAXIMO = 90 * 60;
const INTENTOS_DE_AJUSTE = 4;

class AudioError extends Error {
  constructor(mensaje, estado = 500) {
    super(mensaje);
    this.name = 'AudioError';
    this.estado = estado;
  }
}

async function carpetaTemporal() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'clase-'));
}

// ffmpeg escribe la duracion en su salida de diagnostico, no en la estandar.
function leerDuracion(salidaDeError) {
  const encontrado = /Duration:\s*(\d+):(\d+):(\d+\.?\d*)/.exec(salidaDeError);
  if (!encontrado) return null;
  const [, horas, minutos, segundos] = encontrado;
  return Number(horas) * 3600 + Number(minutos) * 60 + Number(segundos);
}

async function duracionSegundos(ruta) {
  try {
    // Sin archivo de salida ffmpeg termina con error, pero antes informa lo
    // que leyo del archivo, que es lo unico que se necesita aqui.
    await ejecutar(rutaFfmpeg, ['-i', ruta]);
    return null;
  } catch (error) {
    return leerDuracion(error.stderr || '');
  }
}

// -vn descarta el video, -ac 1 lo deja en un canal.
async function comprimirVoz(entrada, salida) {
  await ejecutar(rutaFfmpeg, [
    '-y', '-i', entrada,
    '-vn', '-ac', '1', '-b:a', BITRATE, '-c:a', 'aac',
    salida,
  ], { maxBuffer: 10 * 1024 * 1024 });
}

async function extraerTrozo(entrada, salida, desde, duracion) {
  await ejecutar(rutaFfmpeg, [
    '-y', '-ss', String(desde), '-t', String(duracion), '-i', entrada,
    '-vn', '-ac', '1', '-b:a', BITRATE, '-c:a', 'aac',
    salida,
  ], { maxBuffer: 10 * 1024 * 1024 });
}

/**
 * Devuelve las partes listas para mandar a Whisper. Casi siempre es una sola.
 * Cada parte lleva el desplazamiento en segundos que hay que sumar a sus
 * tiempos para situarla dentro de la clase completa.
 */
async function prepararParaTranscripcion(buffer, nombre, opciones = {}) {
  // El limite es un parametro y no una constante fija porque depende del
  // proveedor de transcripcion, y porque asi se puede ejercitar el camino de
  // los trozos sin fabricar un archivo de dos horas.
  const limite = opciones.limiteBytes || LIMITE_BYTES;

  if (buffer.length <= limite) {
    return [{ buffer, nombre, desplazamiento: 0 }];
  }

  const carpeta = await carpetaTemporal();
  try {
    const extension = path.extname(nombre) || '.bin';
    const original = path.join(carpeta, `original${extension}`);
    await fs.writeFile(original, buffer);

    const comprimido = path.join(carpeta, 'voz.m4a');
    try {
      await comprimirVoz(original, comprimido);
    } catch (error) {
      // Un archivo sin pista de audio, o en un formato que ffmpeg no abre.
      throw new AudioError(
        'No se pudo leer el audio del archivo. Revise que la grabación tenga sonido.',
        422
      );
    }

    const comprimidoBytes = (await fs.stat(comprimido)).size;
    if (comprimidoBytes <= limite) {
      return [{
        buffer: await fs.readFile(comprimido),
        nombre: `${path.parse(nombre).name}.m4a`,
        desplazamiento: 0,
      }];
    }

    const duracion = await duracionSegundos(comprimido);
    if (!duracion) {
      throw new AudioError('No se pudo medir la duración de la grabación.', 422);
    }

    // Cuantos segundos caben en un trozo, segun lo que de verdad ocupo al
    // comprimirse. Se calcula del archivo real y no del bitrate nominal,
    // porque el contenedor y los metadatos tambien pesan.
    const bytesPorSegundo = comprimidoBytes / duracion;
    const segundosPorTrozo = Math.max(
      1,
      Math.min(Math.floor(limite / bytesPorSegundo), SEGUNDOS_POR_TROZO_MAXIMO)
    );

    const partes = [];
    let desde = 0;
    while (desde < duracion) {
      const salida = path.join(carpeta, `parte-${partes.length}.m4a`);

      // Se comprueba el trozo ya extraido en vez de confiar en la cuenta: cada
      // uno carga su propia cabecera de contenedor y el bitrate real no es
      // exactamente el nominal, asi que la estimacion se queda corta. Un trozo
      // un kilobyte por encima lo rechaza la API igual que uno de 40 MB.
      let duracionTrozo = segundosPorTrozo;
      let bytes;
      for (let intento = 0; intento < INTENTOS_DE_AJUSTE; intento += 1) {
        await extraerTrozo(comprimido, salida, desde, duracionTrozo);
        bytes = (await fs.stat(salida)).size;
        if (bytes <= limite) break;
        // Se acorta en proporcion a lo que se paso, con algo de holgura.
        duracionTrozo = Math.max(1, Math.floor(duracionTrozo * (limite / bytes) * 0.95));
      }
      if (bytes > limite) {
        throw new AudioError(
          'No se pudo dividir la grabación en partes transcribibles.',
          422
        );
      }

      partes.push({
        buffer: await fs.readFile(salida),
        nombre: `${path.parse(nombre).name}-parte-${partes.length + 1}.m4a`,
        desplazamiento: desde,
      });
      desde += duracionTrozo;
    }
    return partes;
  } finally {
    // La carpeta temporal se borra pase lo que pase: son archivos de decenas
    // de megabytes y el servidor se quedaria sin espacio en pocas clases.
    await fs.rm(carpeta, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  prepararParaTranscripcion,
  AudioError,
  LIMITE_BYTES,
  // Se exportan para las pruebas.
  leerDuracion,
};
