// Manejo centralizado de errores y de rutas inexistentes.

// Codigos de PostgreSQL que corresponden a un error del cliente, no del
// servidor. Los controladores suelen atenderlos con un mensaje propio; esto es
// la red de seguridad para los que se escapen.
const CODIGOS_POSTGRES = {
  '23505': { estado: 409, mensaje: 'El registro ya existe' },
  '23503': { estado: 400, mensaje: 'Un dato referenciado no existe' },
  '23502': { estado: 400, mensaje: 'Falta un dato obligatorio' },
  '23514': { estado: 400, mensaje: 'Un dato no cumple las restricciones del modelo' },
  '22P02': { estado: 400, mensaje: 'Un dato tiene un formato invalido' },
};

// Ruta no encontrada.
function notFound(req, res) {
  res.status(404).json({ estado: 'error', mensaje: 'Recurso no encontrado' });
}

// Traduce el error a una respuesta. Solo se responde 500 cuando de verdad
// es un fallo del servidor.
// eslint-disable-next-line no-unused-vars -- Express exige los cuatro parametros
function errorHandler(error, req, res, next) {
  // El cuerpo no era JSON valido.
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      estado: 'error',
      mensaje: 'El cuerpo de la peticion no es JSON valido',
    });
  }

  // El cuerpo excede el limite configurado.
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      estado: 'error',
      mensaje: 'El cuerpo de la peticion es demasiado grande',
    });
  }

  const conocido = CODIGOS_POSTGRES[error.code];
  if (conocido) {
    return res.status(conocido.estado).json({ estado: 'error', mensaje: conocido.mensaje });
  }

  // Origen no permitido por CORS.
  if (error.code === 'ORIGEN_NO_PERMITIDO') {
    return res.status(403).json({ estado: 'error', mensaje: 'Origen no permitido' });
  }

  // A partir de aqui es un fallo no previsto. Se registra completo para poder
  // diagnosticarlo, pero al cliente no se le revela nada del interior.
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error no controlado:', error);
  }
  res.status(500).json({ estado: 'error', mensaje: 'Error interno del servidor' });
}

module.exports = { notFound, errorHandler, CODIGOS_POSTGRES };
