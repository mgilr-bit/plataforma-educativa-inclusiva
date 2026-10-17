// Limites con los que opera la plataforma.
//
// Son de solo lectura a proposito. Cambiarlos desde la pantalla exigiria
// guardarlos en algun sitio, y hoy viven en el codigo y en las variables de
// entorno, que es donde deben estar: un limite de tamaño de archivo no se
// toca sin volver a desplegar.
//
// La pantalla existe igual porque el dato hace falta: cuando alguien pregunta
// cuanto pesa como maximo una clase, la respuesta tiene que estar a la vista
// y no enterrada en un archivo del servidor.
const { TAMANO_MAXIMO_BYTES, FORMATOS_ACEPTADOS } = require('../config/storage');
const claude = require('../config/claude');
const whisper = require('../config/whisper');
const { MAXIMO_INTENTOS_LOGIN, VENTANA_MINUTOS } = require('../middleware/rateLimit');

// GET /api/settings
function leer(req, res) {
  res.json({
    estado: 'ok',
    ajustes: {
      archivos: {
        tamanoMaximoMb: Math.round(TAMANO_MAXIMO_BYTES / (1024 * 1024)),
        formatos: FORMATOS_ACEPTADOS,
      },
      transcripcion: {
        modelo: whisper.modelo,
        // El limite es de la API de OpenAI, no nuestro: por encima de eso el
        // servidor comprime el audio antes de mandarlo.
        tamanoMaximoApiMb: 25,
        configurado: Boolean(whisper.apiKey),
      },
      asistente: {
        modelo: claude.modelo,
        esfuerzo: claude.esfuerzo,
        historialMaximo: claude.HISTORIAL_MAXIMO,
        configurado: Boolean(claude.apiKey),
      },
      sesion: {
        duracion: process.env.JWT_EXPIRES_IN || '8h',
        intentosDeLogin: MAXIMO_INTENTOS_LOGIN,
        ventanaMinutos: VENTANA_MINUTOS,
      },
    },
  });
}

module.exports = { leer };
