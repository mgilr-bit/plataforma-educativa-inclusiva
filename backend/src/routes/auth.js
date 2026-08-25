// Rutas de autenticacion.
const { Router } = require('express');
const { register, login, profile } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

const router = Router();

// El alta de usuarios queda reservada al administrador.
router.post('/auth/register', authenticate, authorize('administrador'), register);
router.post('/auth/login', login);
router.get('/auth/me', authenticate, profile);

module.exports = router;
