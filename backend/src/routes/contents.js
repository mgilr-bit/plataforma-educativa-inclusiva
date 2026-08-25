// Rutas del CRUD de contenidos educativos.
const { Router } = require('express');
const { list, getById, create, update, deactivate } = require('../controllers/contentsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

// Todas las rutas exigen sesion iniciada.
router.use('/contents', authenticate);

// La lectura la comparten los tres roles; el controlador filtra lo visible.
router.get('/contents', list);
router.get('/contents/:id', getById);

// La escritura queda para docentes y administradores; el controlador verifica
// ademas que el docente sea el titular del curso.
router.post('/contents', authorize('administrador', 'docente'), create);
router.patch('/contents/:id', authorize('administrador', 'docente'), update);
router.delete('/contents/:id', authorize('administrador', 'docente'), deactivate);

module.exports = router;
