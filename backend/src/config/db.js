// Pool de conexiones a PostgreSQL.
// La cadena de conexión se toma de la variable de entorno DATABASE_URL.
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error(
    'Falta la variable de entorno DATABASE_URL. Copie backend/.env.example a backend/.env.'
  );
}

// Si la base exige TLS se declara de forma explicita. Antes se deducia de
// NODE_ENV, lo que mezclaba dos cosas independientes: estar en produccion y que
// la base pida cifrado. En Railway, por ejemplo, la conexion interna va por red
// privada y no ofrece TLS, de modo que exigirlo rompia el arranque.
const usarSSL = process.env.DATABASE_SSL === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: usarSSL ? { rejectUnauthorized: false } : false,
});

// Errores de clientes inactivos del pool: se registran para no derribar el proceso.
pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error.message);
});

module.exports = pool;
