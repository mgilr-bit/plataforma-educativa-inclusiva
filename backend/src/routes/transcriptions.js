// Rutas de transcripciones y subtitulos.
const { Router } = require('express');
const multer = require('multer');
const {
  create,
  getByContent,
  update,
  updateSubtitle,
} = require('../controllers/transcriptionsController');
const { authenticate, authorize } = require('../middleware/auth');
const { TAMANO_MAXIMO_BYTES, FORMATOS_ACEPTADOS } = require('../config/whisper');

// El audio se mantiene en memoria: se reenvia a Whisper y se descarta. La
// plataforma todavia no tiene almacenamiento de archivos.
const carga = multer({
  storage: multer.memoryStorage(),
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
function manejarErroresDeCarga(error, req, res, next) {
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

const router = Router();

// Generar la transcripcion es tarea del docente titular o del administrador.
router.post(
  '/contents/:id/transcription',
  authenticate,
  authorize('administrador', 'docente'),
  carga.single('audio'),
  manejarErroresDeCarga,
  create
);

// Los tres roles pueden leerla: el estudiante la necesita para los subtitulos.
router.get('/contents/:id/transcription', authenticate, getByContent);

router.patch('/transcriptions/:id', authenticate, authorize('administrador', 'docente'), update);
router.patch('/subtitles/:id', authenticate, authorize('administrador', 'docente'), updateSubtitle);

module.exports = router;
