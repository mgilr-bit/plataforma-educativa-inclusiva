// Configuracion de la autenticacion basada en JSON Web Tokens.

if (!process.env.JWT_SECRET) {
  throw new Error(
    'Falta la variable de entorno JWT_SECRET. Copie backend/.env.example a backend/.env.'
  );
}

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  // Vigencia del token; se puede ajustar sin tocar el codigo.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  // Costo del hash de bcrypt. 10 es el equilibrio habitual entre seguridad y tiempo.
  bcryptRounds: 10,
};
