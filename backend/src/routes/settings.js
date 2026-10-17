// Ruta de los límites de la plataforma.
const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { leer } = require('../controllers/settingsController');

const router = Router();

// Solo el administrador: no es informacion secreta, pero tampoco tiene por
// que estar al alcance de un estudiante.
router.get('/settings', authenticate, authorize('administrador'), leer);

module.exports = router;
