// Quien puede generar la transcripcion de un material.
//
// Vive aparte del boton porque la pantalla tambien lo necesita: cuando nadie
// puede generarla, hay que explicar la espera en su lugar.

// Whisper transcribe voz. Un documento no tiene nada que transcribir.
const TIPOS_TRANSCRIBIBLES = ['audio', 'video'];

// El backend lee el archivo del disco de la plataforma. Si el material apunta
// a un enlace de otro sitio no puede descargarlo, asi que ofrecer el boton ahi
// seria prometer algo que termina en error.
const PREFIJO_GUARDADO = '/archivos/';

export function puedeGenerar(user, content) {
  if (!user || !content) return false;

  const esTitular = user.rol === 'administrador'
    || (user.rol === 'docente' && user.id_usuario === content.id_docente);
  if (!esTitular) return false;

  return TIPOS_TRANSCRIBIBLES.includes(content.tipo)
    && typeof content.url_archivo === 'string'
    && content.url_archivo.startsWith(PREFIJO_GUARDADO);
}
