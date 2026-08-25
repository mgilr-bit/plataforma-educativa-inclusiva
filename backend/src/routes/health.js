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

module.exports = router;
