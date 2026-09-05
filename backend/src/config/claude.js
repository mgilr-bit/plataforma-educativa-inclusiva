// Configuracion del asistente educativo (Claude API de Anthropic).
//
// Igual que con Whisper, la clave no se valida al arrancar: sin ella solo el
// endpoint del tutor responde 503 y el resto de la API sigue operando.

// Modelo por defecto del asistente. Las variables llevan prefijo TUTOR_ y no
// CLAUDE_ porque CLAUDE_EFFORT ya existe en el entorno de Claude Code y se
// colaba en la configuracion.
const MODELO_POR_DEFECTO = 'claude-opus-5';

// Nivel de esfuerzo. Se usa "low" porque las consultas de los estudiantes son
// preguntas escolares directas: mas esfuerzo encarece y demora sin mejorar la
// respuesta. Se puede subir a medium o high desde el entorno.
const ESFUERZO_POR_DEFECTO = 'low';

// Tope de la respuesta. Es un limite, no un objetivo: solo se paga lo generado.
const MAX_TOKENS = 16000;

// Cuantos intercambios previos se envian como contexto de la conversacion.
const HISTORIAL_MAXIMO = 6;

// Recorte del texto de la transcripcion que se adjunta como contexto.
const MAX_CARACTERES_CONTEXTO = 20000;

module.exports = {
  get apiKey() {
    return process.env.ANTHROPIC_API_KEY || null;
  },
  // Configurable para poder apuntar a un servidor de pruebas.
  get baseUrl() {
    return process.env.ANTHROPIC_BASE_URL || null;
  },
  get modelo() {
    return process.env.TUTOR_MODEL || MODELO_POR_DEFECTO;
  },
  get esfuerzo() {
    return process.env.TUTOR_EFFORT || ESFUERZO_POR_DEFECTO;
  },
  MAX_TOKENS,
  HISTORIAL_MAXIMO,
  MAX_CARACTERES_CONTEXTO,
};
