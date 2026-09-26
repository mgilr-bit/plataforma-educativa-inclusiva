// Recepcion de los archivos que sube el docente.
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const {
  DIRECTORIO, TAMANO_MAXIMO_BYTES, FORMATOS_ACEPTADOS, asegurarDirectorio,
} = require('../config/storage');

const almacen = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, asegurarDirectorio());
  },
  filename: (req, file, cb) => {
    // El nombre se genera al azar por dos motivos: el original puede traer
    // acentos, espacios o rutas que compliquen el servido, y un nombre
    // predecible permitiria adivinar direcciones de otros archivos.
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const subida = multer({
  storage: almacen,
  limits: { fileSize: TAMANO_MAXIMO_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const extension = (file.originalname.split('.').pop() || '').toLowerCase();
    if (!FORMATOS_ACEPTADOS.includes(extension)) {
      return cb(new multer.MulterError('LIMITE_FORMATO'));
    }
    cb(null, true);
  },
});

// Traduce los errores de multer a respuestas propias de la API.
function manejarErroresDeSubida(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      const limiteMb = Math.round(TAMANO_MAXIMO_BYTES / (1024 * 1024));
      return res.status(413).json({
        estado: 'error',
        mensaje: `El archivo excede el limite de ${limiteMb} MB`,
      });
    }
    if (error.code === 'LIMITE_FORMATO') {
      return res.status(415).json({
        estado: 'error',
        mensaje: `Formato no admitido. Use: ${FORMATOS_ACEPTADOS.join(', ')}`,
      });
    }
    return res.status(400).json({ estado: 'error', mensaje: 'El archivo enviado no es valido' });
  }
  next(error);
}

module.exports = { subida, manejarErroresDeSubida, DIRECTORIO };
