// Pool de conexiones a PostgreSQL.
// La cadena de conexión se toma de la variable de entorno DATABASE_URL.
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error(
    'Falta la variable de entorno DATABASE_URL. Copie backend/.env.example a backend/.env.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // En producción (Railway) el proveedor exige TLS; en local no se usa.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Errores de clientes inactivos del pool: se registran para no derribar el proceso.
pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error.message);
});

module.exports = pool;
