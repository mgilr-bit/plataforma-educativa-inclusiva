// Punto de entrada de la API REST.
require('dotenv').config();

const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 4000;

const servidor = app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

// Un fallo no capturado no debe dejar el proceso en un estado indefinido: se
// registra y se cierra de forma ordenada para que el orquestador lo reinicie.
process.on('unhandledRejection', (motivo) => {
  console.error('Promesa rechazada sin manejar:', motivo);
});

process.on('uncaughtException', (error) => {
  console.error('Excepcion no capturada:', error);
  cerrar('uncaughtException', 1);
});

// Railway envia SIGTERM al redesplegar. Cerrar ordenadamente evita cortar
// peticiones a medias y deja libres las conexiones a la base.
function cerrar(senal, codigo = 0) {
  console.log(`Recibido ${senal}: cerrando el servidor...`);
  servidor.close(() => {
    pool.end()
      .catch((error) => console.error('Error al cerrar el pool:', error.message))
      .finally(() => process.exit(codigo));
  });

  // Si las conexiones abiertas no terminan a tiempo, se fuerza la salida.
  setTimeout(() => process.exit(codigo), 10000).unref();
}

process.on('SIGTERM', () => cerrar('SIGTERM'));
process.on('SIGINT', () => cerrar('SIGINT'));
