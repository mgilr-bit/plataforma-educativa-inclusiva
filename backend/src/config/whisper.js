// Configuracion del servicio de transcripcion (Whisper API de OpenAI).
//
// La clave no se valida al arrancar: el resto de la API debe seguir funcionando
// aunque la transcripcion no este configurada. La ruta correspondiente responde
// 503 cuando falta.

// La URL base es configurable para poder apuntar a un servidor de pruebas.
const BASE_URL_POR_DEFECTO = 'https://api.openai.com/v1';
const MODELO_POR_DEFECTO = 'whisper-1';

// Whisper rechaza archivos de mas de 25 MB.
const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024;

// Formatos que acepta la API.
const FORMATOS_ACEPTADOS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg', 'flac'];

module.exports = {
  get apiKey() {
    return process.env.OPENAI_API_KEY || null;
  },
  get baseUrl() {
    return process.env.OPENAI_BASE_URL || BASE_URL_POR_DEFECTO;
  },
  get modelo() {
    return process.env.WHISPER_MODEL || MODELO_POR_DEFECTO;
  },
  // El idioma se declara para mejorar la precision; el contexto es Guatemala.
  idiomaPorDefecto: 'es',
  tiempoLimiteMs: 120000,
  TAMANO_MAXIMO_BYTES,
  FORMATOS_ACEPTADOS,
};
