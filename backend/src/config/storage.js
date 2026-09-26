// Almacenamiento de los archivos de las clases.
//
// Los archivos se guardan en disco, en una carpeta fuera del codigo fuente. Es
// suficiente para el desarrollo y para un piloto en un establecimiento; un
// despliegue con varias instancias necesitaria almacenamiento compartido.
const path = require('node:path');
const fs = require('node:fs');

// Configurable para poder apuntar a un volumen montado en el despliegue.
const DIRECTORIO = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

// Ruta publica desde la que se sirven. Se separa del directorio en disco para
// que una cosa pueda cambiar sin la otra.
const RUTA_PUBLICA = '/archivos';

// 200 MB: una clase grabada en video ocupa bastante mas que el audio suelto,
// y el limite de Whisper (25 MB) solo aplica a lo que se envia a transcribir.
const TAMANO_MAXIMO_BYTES = 200 * 1024 * 1024;

const FORMATOS_ACEPTADOS = [
  'mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg', 'flac', 'mpeg', 'mpga',
  'pdf', 'doc', 'docx', 'odt', 'txt',
];

function asegurarDirectorio() {
  if (!fs.existsSync(DIRECTORIO)) {
    fs.mkdirSync(DIRECTORIO, { recursive: true });
  }
  return DIRECTORIO;
}

module.exports = {
  DIRECTORIO,
  RUTA_PUBLICA,
  TAMANO_MAXIMO_BYTES,
  FORMATOS_ACEPTADOS,
  asegurarDirectorio,
};
