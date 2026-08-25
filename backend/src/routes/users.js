// Rutas del CRUD de usuarios.
const { Router } = require('express');
const { list, getById, create, update, deactivate } = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

// Todas las rutas exigen sesion iniciada.
router.use('/users', authenticate);

router.get('/users', authorize('administrador'), list);
router.post('/users', authorize('administrador'), create);
router.delete('/users/:id', authorize('administrador'), deactivate);

// El propio usuario puede consultarse y modificarse; el control fino esta en el controlador.
router.get('/users/:id', getById);
router.patch('/users/:id', update);

module.exports = router;
