// Cifra una contrasena y genera la sentencia SQL para actualizarla.
//
// Sirve para restablecer la contrasena de un usuario en un entorno donde no se
// puede ejecutar el backend, por ejemplo desde la consola de la base en
// produccion. La contrasena nunca sale de esta maquina: solo viaja el hash.
//
// Uso: node scripts/hash-password.js "correo@dominio.gt" "LaContrasena"
const bcrypt = require('bcryptjs');

// Mismo costo que usa el backend al registrar usuarios.
const COSTO = 10;
const MIN_LARGO = 8;

const [correo, clave] = process.argv.slice(2);

if (!correo || !clave) {
  console.error('Uso: node scripts/hash-password.js "correo@dominio.gt" "LaContrasena"');
  process.exit(1);
}
if (clave.length < MIN_LARGO) {
  console.error(`La contrasena debe tener al menos ${MIN_LARGO} caracteres.`);
  process.exit(1);
}

const hash = bcrypt.hashSync(clave, COSTO);

// Se comprueba aqui mismo: si el hash no verifica, no tiene sentido llevarlo a
// la base y descubrirlo despues con un 401 sin explicacion.
if (bcrypt.compareSync(clave, hash) === false) {
  console.error('El hash generado no verifica contra la contrasena. No lo use.');
  process.exit(1);
}

console.log(`Hash generado (${hash.length} caracteres) y verificado.`);
console.log();
console.log('Ejecute esta sentencia en la base de datos:');
console.log();
console.log(
  `UPDATE usuario SET contrasena_hash = '${hash}' ` +
  `WHERE correo = LOWER('${correo}') ` +
  `RETURNING id_usuario, correo, LENGTH(contrasena_hash) AS largo;`
);
