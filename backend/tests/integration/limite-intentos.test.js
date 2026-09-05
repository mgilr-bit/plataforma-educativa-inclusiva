// Pruebas del limite de intentos de inicio de sesion.
//
// El resto de las pruebas corre con los limites desactivados; este archivo los
// activa a proposito para comprobar que existen. Va en su propio archivo porque
// el ejecutor de Node aisla cada uno en un proceso distinto, de modo que el
// contador en memoria no contamina a los demas.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, pool, sembrarEscenario, CONTRASENA } = require('../helpers/datos');
const { MAXIMO_INTENTOS_LOGIN } = require('../../src/middleware/rateLimit');

describe('Limite de intentos de inicio de sesion', () => {
  before(async () => {
    await sembrarEscenario();
    // Los limitadores consultan NODE_ENV en cada peticion.
    process.env.NODE_ENV = 'produccion-de-prueba';
  });

  after(async () => {
    process.env.NODE_ENV = 'test';
    await pool.end();
  });

  test('corta la fuerza bruta tras agotar los intentos', async () => {
    const fallidos = [];
    for (let i = 0; i < MAXIMO_INTENTOS_LOGIN; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ correo: 'admin@prueba.gt', contrasena: `equivocada-${i}` });
      fallidos.push(res.status);
    }

    // Los primeros intentos responden 401: el limite aun no se agota.
    assert.ok(fallidos.every((codigo) => codigo === 401), `codigos: ${fallidos.join(',')}`);

    // El siguiente ya se rechaza sin llegar a comprobar la contrasena.
    const bloqueado = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@prueba.gt', contrasena: 'otra-mas' });

    assert.equal(bloqueado.status, 429);
    assert.match(bloqueado.body.mensaje, /Demasiados intentos/i);
  });

  test('el bloqueo tambien alcanza a la contrasena correcta', async () => {
    // Importa que sea asi: si el atacante acierta despues de agotar la cuota,
    // no debe entrar hasta que pase la ventana.
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@prueba.gt', contrasena: CONTRASENA });

    assert.equal(res.status, 429);
  });

  test('anuncia el limite en las cabeceras estandar', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@prueba.gt', contrasena: 'x' });

    assert.ok(res.headers['ratelimit'] || res.headers['ratelimit-limit'],
      'deberia incluir cabeceras RateLimit');
  });
});
