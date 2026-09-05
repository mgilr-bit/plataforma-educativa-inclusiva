// Ruta de salud: verifica que la API responde y que la base de datos es alcanzable.
const { Router } = require('express');
const pool = require('../config/db');

const router = Router();

// GET /api/health
router.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) AS total FROM rol');
    const rolesRegistrados = Number(result.rows[0].total);

    res.json({
      estado: 'ok',
      baseDatos: 'conectada',
      rolesRegistrados,
      marcaTiempo: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Fallo la verificacion de salud:', error.message);
    res.status(503).json({
      estado: 'error',
      baseDatos: 'sin conexion',
      mensaje: error.message,
    });
  }
});

// GET /api/health/red
// Diagnostico de la cadena de proxies. Sin el, el numero de saltos de confianza
// solo se puede adivinar, y de ese numero depende que el limite de intentos
// distinga a un cliente de otro. No expone nada que el cliente no sepa ya de si
// mismo: su propia direccion y las cabeceras que el mismo envio.
router.get('/health/red', (req, res) => {
  res.json({
    estado: 'ok',
    saltosDeConfianza: req.app.get('trust proxy'),
    direccionDetectada: req.ip,
    cadenaDeDirecciones: req.ips,
    xForwardedFor: req.headers['x-forwarded-for'] || null,
  });
});

module.exports = router;
