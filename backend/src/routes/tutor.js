// Rutas del asistente educativo.
const { Router } = require('express');
const { ask, list } = require('../controllers/tutorController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.use('/tutor', authenticate);

// Preguntar es del estudiante: la tabla consulta_tutor registra id_estudiante.
router.post('/tutor/ask', authorize('estudiante'), ask);

// El historial lo consultan los tres roles, con distinto alcance.
router.get('/tutor/consultations', list);

module.exports = router;
