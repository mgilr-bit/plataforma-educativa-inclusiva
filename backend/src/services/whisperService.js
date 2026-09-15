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
    let codigo = null;
    try {
      codigo = JSON.parse(detalle)?.error?.code;
    } catch {
      // El proveedor no siempre responde en JSON.
    }

    // Un 429 puede ser falta de saldo o exceso de peticiones, y lo que hay que
    // hacer es distinto: recargar la cuenta, o esperar. Decir "respondio 429"
    // no le sirve de nada a un docente.
    if (codigo === 'insufficient_quota' || codigo === 'credit_balance_exhausted') {
      throw new WhisperError(
        'El servicio de transcripcion no tiene saldo disponible. Avise al administrador de la plataforma.',
        { estado: 503, causa: detalle.slice(0, 500) }
      );
    }

    if (respuesta.status === 429) {
      throw new WhisperError(
        'El servicio de transcripcion esta saturado. Intente de nuevo en unos minutos.',
        { estado: 429, causa: detalle.slice(0, 500) }
      );
    }

    if (respuesta.status === 401) {
      throw new WhisperError(
        'La clave del servicio de transcripcion no es valida. Avise al administrador de la plataforma.',
        { estado: 503, causa: detalle.slice(0, 500) }
      );
    }

    throw new WhisperError(
      `El servicio de transcripcion respondio ${respuesta.status}`,
      { estado: 502, causa: detalle.slice(0, 500) }
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
