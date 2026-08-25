// Crea el primer usuario administrador, necesario para poder registrar a los demas.
// Uso: node scripts/create-admin.js "Nombre Completo" correo@dominio.com "contrasena"
require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');
const { bcryptRounds } = require('../src/config/auth');

const ROL_ADMINISTRADOR = 'administrador';

async function main() {
  const [nombreCompleto, correo, contrasena] = process.argv.slice(2);

  if (!nombreCompleto || !correo || !contrasena) {
    console.error('Uso: node scripts/create-admin.js "Nombre Completo" correo@dominio.com "contrasena"');
    process.exit(1);
  }

  if (contrasena.length < 8) {
    console.error('La contrasena debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const rol = await pool.query('SELECT id_rol FROM rol WHERE nombre_rol = $1', [ROL_ADMINISTRADOR]);
  if (rol.rowCount === 0) {
    console.error(`No existe el rol "${ROL_ADMINISTRADOR}". Ejecute primero los datos semilla.`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(contrasena, bcryptRounds);
  const result = await pool.query(
    `INSERT INTO usuario (nombre_completo, correo, contrasena_hash, id_rol)
     VALUES ($1, LOWER($2), $3, $4)
     ON CONFLICT (correo) DO NOTHING
     RETURNING id_usuario, correo`,
    [nombreCompleto.trim(), correo.trim(), hash, rol.rows[0].id_rol]
  );

  if (result.rowCount === 0) {
    console.error(`El correo ${correo} ya esta registrado.`);
    process.exit(1);
  }

  console.log(`Administrador creado: ${result.rows[0].correo} (id ${result.rows[0].id_usuario})`);
}

main()
  .catch((error) => {
    console.error('Error al crear el administrador:', error.message);
    process.exit(1);
  })
  .finally(() => pool.end());
