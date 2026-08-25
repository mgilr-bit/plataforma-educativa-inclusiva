// Rutas de autenticacion.
const { Router } = require('express');
const { login, profile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = Router();

// El alta de usuarios vive en POST /api/users, restringida al administrador.
router.post('/auth/login', login);
router.get('/auth/me', authenticate, profile);

module.exports = router;
