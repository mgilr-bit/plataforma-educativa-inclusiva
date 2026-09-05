// Pruebas de integracion de la autenticacion.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, pool, sembrarEscenario, CONTRASENA } = require('../helpers/datos');

describe('Autenticacion', () => {
  before(async () => { await sembrarEscenario(); });
  after(async () => { await pool.end(); });

  test('inicia sesion con credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@prueba.gt', contrasena: CONTRASENA });

    assert.equal(res.status, 200);
    assert.ok(res.body.token, 'deberia devolver un token');
    assert.equal(res.body.usuario.rol, 'administrador');
    assert.equal(res.body.usuario.contrasena_hash, undefined, 'nunca debe exponer el hash');
  });

  test('el correo no distingue mayusculas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'ADMIN@PRUEBA.GT', contrasena: CONTRASENA });
    assert.equal(res.status, 200);
  });

  test('rechaza una contrasena incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@prueba.gt', contrasena: 'equivocada' });
    assert.equal(res.status, 401);
  });

  test('da el mismo mensaje si el correo no existe, para no revelar cuales estan registrados', async () => {
    const inexistente = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'nadie@prueba.gt', contrasena: 'equivocada' });
    const existente = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@prueba.gt', contrasena: 'equivocada' });

    assert.equal(inexistente.status, existente.status);
    assert.equal(inexistente.body.mensaje, existente.body.mensaje);
  });

  test('impide iniciar sesion a una cuenta desactivada', async () => {
    await pool.query("UPDATE usuario SET estado = FALSE WHERE correo = 'alumno2@prueba.gt'");
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'alumno2@prueba.gt', contrasena: CONTRASENA });

    assert.equal(res.status, 403);
    await pool.query("UPDATE usuario SET estado = TRUE WHERE correo = 'alumno2@prueba.gt'");
  });

  test('/auth/me exige token', async () => {
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
  });

  test('una ruta inexistente responde 404 en json', async () => {
    const res = await request(app).get('/api/no-existe');
    assert.equal(res.status, 404);
    assert.equal(res.body.estado, 'error');
  });
});
