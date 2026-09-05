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
const { notFound, errorHandler } = require('./middleware/errors');

// Limite del cuerpo JSON. Las peticiones de la plataforma son pequenas; el
// audio de las transcripciones no pasa por aqui, sino por multipart.
const LIMITE_CUERPO = '100kb';

const app = express();

// Origenes permitidos. En desarrollo se admite cualquiera; en produccion solo
// los declarados en CORS_ORIGINS, separados por comas.
const origenesPermitidos = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

app.use(cors({
  origin(origen, callback) {
    if (origenesPermitidos.length === 0 || !origen || origenesPermitidos.includes(origen)) {
      return callback(null, true);
    }
    const error = new Error('Origen no permitido');
    error.code = 'ORIGEN_NO_PERMITIDO';
    return callback(error);
  },
}));

app.use(express.json({ limit: LIMITE_CUERPO }));

// Rutas de la API
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', usersRoutes);
app.use('/api', contentsRoutes);
app.use('/api', coursesRoutes);
app.use('/api', transcriptionsRoutes);
app.use('/api', tutorRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
