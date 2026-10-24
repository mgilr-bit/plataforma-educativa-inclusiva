// Lo que comparten los dos usos de la Claude API: el tutor y los resumenes.
//
// Se separa para no tener dos traducciones de los mismos errores que se vayan
// apartando con el tiempo. Cada servicio conserva su propia clase de error,
// porque los controladores distinguen por ella.
const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/claude');

let clienteMemorizado = null;

// El cliente se crea una sola vez, pero solo cuando hay clave configurada.
function obtenerCliente(crearError) {
  if (!config.apiKey) {
    throw crearError('El asistente educativo no esta configurado', { estado: 503 });
  }
  if (!clienteMemorizado) {
    const opciones = { apiKey: config.apiKey };
    if (config.baseUrl) {
      opciones.baseURL = config.baseUrl;
    }
    clienteMemorizado = new Anthropic(opciones);
  }
  return clienteMemorizado;
}

// La API avisa de la falta de saldo con un 400 y un mensaje en ingles, no con
// un codigo propio. Se reconoce por el texto porque es lo unico que da.
function esFaltaDeSaldo(error) {
  if (!(error instanceof Anthropic.APIError) || error.status !== 400) return false;
  const mensaje = error.error?.error?.message || error.message || '';
  return /credit balance/i.test(mensaje);
}

// Traduce los fallos del SDK a mensajes que un docente pueda entender y actuar
// en consecuencia: no es lo mismo quedarse sin saldo que equivocarse de clave.
function traducirError(error, crearError) {
  // Va antes del resto: llega como un 400 cualquiera, y sin distinguirlo se
  // le decia al docente "el asistente respondio con un error (400)", que no
  // dice si hay que recargar, esperar o avisar a alguien.
  if (esFaltaDeSaldo(error)) {
    return crearError(
      'El asistente educativo no tiene saldo disponible. Avise al administrador de la plataforma.',
      // 503 y no 400: el servicio no esta disponible, no es culpa de lo que
      // pidio el usuario.
      { estado: 503, causa: error }
    );
  }

  if (error instanceof Anthropic.AuthenticationError) {
    return crearError('La clave del asistente educativo no es valida', { estado: 503, causa: error });
  }
  if (error instanceof Anthropic.RateLimitError) {
    return crearError('El asistente esta saturado. Intente de nuevo en unos minutos.', {
      estado: 429,
      causa: error,
    });
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return crearError('No se pudo contactar el asistente educativo', { estado: 502, causa: error });
  }
  if (error instanceof Anthropic.APIError) {
    return crearError(`El asistente respondio con un error (${error.status})`, {
      estado: 502,
      causa: error,
    });
  }
  return error;
}

// Deja el cliente sin memorizar. Solo lo usan las pruebas, que cambian la
// clave entre casos.
function olvidarCliente() {
  clienteMemorizado = null;
}

module.exports = { obtenerCliente, traducirError, olvidarCliente };
