// Punto de entrada de la API REST.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', usersRoutes);

// Recurso no encontrado
app.use((req, res) => {
  res.status(404).json({ estado: 'error', mensaje: 'Recurso no encontrado' });
});

// Manejador central de errores
app.use((error, req, res, next) => {
  console.error('Error no controlado:', error.message);
  res.status(500).json({ estado: 'error', mensaje: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
