// Cliente de la Whisper API de OpenAI.
//
// Se usa fetch nativo (Node 18+) en lugar del SDK: la peticion es una sola
// llamada multipart y el SDK anadiria una dependencia grande sin aportar nada.
const config = require('../config/whisper');

class WhisperError extends Error {
  constructor(mensaje, { estado, causa } = {}) {
    super(mensaje);
    this.name = 'WhisperError';
    // Codigo HTTP con el que responder al cliente de la API.
    this.estado = estado || 502;
    this.causa = causa;
  }
}

// Envia el audio a Whisper y devuelve el texto y los segmentos con sus tiempos.
async function transcribeAudio(buffer, nombreArchivo, { idioma } = {}) {
  if (!config.apiKey) {
    throw new WhisperError('El servicio de transcripcion no esta configurado', { estado: 503 });
  }

  const formulario = new FormData();
  formulario.append('file', new Blob([buffer]), nombreArchivo);
  formulario.append('model', config.modelo);
  // verbose_json es el unico formato que devuelve los segmentos con marcas de tiempo.
  formulario.append('response_format', 'verbose_json');
  formulario.append('language', idioma || config.idiomaPorDefecto);

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), config.tiempoLimiteMs);

  let respuesta;
  try {
    respuesta = await fetch(`${config.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: formulario,
      signal: control.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new WhisperError('El servicio de transcripcion tardo demasiado en responder', {
        estado: 504,
        causa: error,
      });
    }
    throw new WhisperError('No se pudo contactar el servicio de transcripcion', {
      estado: 502,
      causa: error,
    });
  } finally {
    clearTimeout(temporizador);
  }

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    // 401 y 429 del proveedor se traducen a codigos propios para no confundir
    // al cliente con un problema de su propia autenticacion.
    const estado = respuesta.status === 429 ? 429 : 502;
    throw new WhisperError(
      `El servicio de transcripcion respondio ${respuesta.status}`,
      { estado, causa: detalle.slice(0, 500) }
    );
  }

  const datos = await respuesta.json();

  if (!datos || typeof datos.text !== 'string') {
    throw new WhisperError('El servicio de transcripcion devolvio una respuesta inesperada');
  }

  return {
    texto: datos.text.trim(),
    idioma: datos.language || null,
    duracionSeg: typeof datos.duration === 'number' ? datos.duration : null,
    segmentos: Array.isArray(datos.segments)
      ? datos.segments.map((s) => ({
          texto: String(s.text || '').trim(),
          inicio: Number(s.start) || 0,
          fin: Number(s.end) || 0,
        }))
      : [],
  };
}

module.exports = { transcribeAudio, WhisperError };
