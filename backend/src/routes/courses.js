// Rutas de cursos e inscripciones.
const { Router } = require('express');
const { list, getById, create, update } = require('../controllers/coursesController');
const inscripciones = require('../controllers/enrollmentsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

router.use('/courses', authenticate);

// La lectura la comparten los tres roles; el controlador filtra lo visible.
router.get('/courses', list);
router.get('/courses/:id', getById);

// El alta de cursos es del administrador: asigna el docente titular.
router.post('/courses', authorize('administrador'), create);
router.patch('/courses/:id', authorize('administrador', 'docente'), update);

// Inscripciones: las gestiona el administrador o el docente titular.
router.get('/courses/:id/enrollments', authorize('administrador', 'docente'), inscripciones.list);
router.post('/courses/:id/enrollments', authorize('administrador', 'docente'), inscripciones.enroll);
router.delete('/courses/:id/enrollments/:idEstudiante', authorize('administrador', 'docente'), inscripciones.unenroll);

module.exports = router;
