// Rutas de los resumenes en lenguaje sencillo.
const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { create, list, update, remove } = require('../controllers/summariesController');

const router = Router();

// Generar cuesta saldo del asistente, asi que es tarea del docente titular.
router.post(
  '/contents/:id/summary',
  authenticate,
  authorize('administrador', 'docente'),
  create
);

// Leerlos lo puede hacer cualquiera con sesion: para el estudiante son la
// puerta de entrada a la clase.
router.get('/contents/:id/summaries', authenticate, list);

router.patch('/summaries/:id', authenticate, authorize('administrador', 'docente'), update);
router.delete('/summaries/:id', authenticate, authorize('administrador', 'docente'), remove);

module.exports = router;
