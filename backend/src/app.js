// Construccion de la aplicacion Express.
//
// Se separa de server.js para que las pruebas puedan montar la app sin abrir
// un puerto.
const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const contentsRoutes = require('./routes/contents');
const coursesRoutes = require('./routes/courses');
const transcriptionsRoutes = require('./routes/transcriptions');
const tutorRoutes = require('./routes/tutor');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', usersRoutes);
app.use('/api', contentsRoutes);
app.use('/api', coursesRoutes);
app.use('/api', transcriptionsRoutes);
app.use('/api', tutorRoutes);

// Recurso no encontrado
app.use((req, res) => {
  res.status(404).json({ estado: 'error', mensaje: 'Recurso no encontrado' });
});

// Manejador central de errores
app.use((error, req, res, next) => {
  // En las pruebas el ruido de consola estorba y no aporta.
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error no controlado:', error.message);
  }
  res.status(500).json({ estado: 'error', mensaje: 'Error interno del servidor' });
});

module.exports = app;
