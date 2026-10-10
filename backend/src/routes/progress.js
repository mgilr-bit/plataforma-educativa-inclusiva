// Rutas del progreso y del panel de seguimiento.
const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  guardar, seguimiento, exportar, sugerencia,
} = require('../controllers/progressController');

const router = Router();

// Lo registra el estudiante al abrir un material y al avanzar en el.
router.put('/contents/:id/progress', authenticate, authorize('estudiante'), guardar);

// El panel es del docente titular y del administrador.
router.get('/courses/:id/tracking', authenticate, authorize('administrador', 'docente'), seguimiento);
router.get('/courses/:id/tracking/export', authenticate, authorize('administrador', 'docente'), exportar);
router.post('/courses/:id/tracking/suggestion', authenticate, authorize('administrador', 'docente'), sugerencia);

module.exports = router;
