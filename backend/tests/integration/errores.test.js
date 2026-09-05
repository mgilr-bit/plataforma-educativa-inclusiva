// Pruebas de integracion del manejo de errores.
//
// Cada caso de este archivo devolvia 500 antes del PR que lo introdujo. Un 500
// ante una entrada mal formada oculta el problema real al cliente y ensucia los
// registros del servidor con fallos que no son del servidor.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, pool, sembrarEscenario, iniciarSesion } = require('../helpers/datos');

describe('Manejo de errores', () => {
  let token;

  before(async () => {
    await sembrarEscenario();
    token = await iniciarSesion('admin@prueba.gt');
  });

  after(async () => { await pool.end(); });

  const con = () => ({ Authorization: `Bearer ${token}` });

  test('un cuerpo JSON malformado responde 400, no 500', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"correo": roto,,}');

    assert.equal(res.status, 400);
    assert.match(res.body.mensaje, /JSON/i);
  });

  test('un cuerpo demasiado grande responde 413, no 500', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ correo: 'a'.repeat(200000) }));

    assert.equal(res.status, 413);
  });

  test('un objeto donde se espera texto responde 400, no 500', async () => {
    // Forma tipica de sondeo automatizado. Con consultas parametrizadas no hay
    // inyeccion posible, pero el 500 delataba una ruta que revienta.
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: { $ne: null }, contrasena: { $ne: null } });

    assert.equal(res.status, 400);
  });

  test('una contrasena que no es texto responde 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'admin@prueba.gt', contrasena: 12345678 });
    assert.equal(res.status, 400);
  });

  describe('parametros de consulta repetidos', () => {
    // ?buscar=a&buscar=b llega como arreglo, no como cadena.
    const casos = [
      ['/api/users?buscar=uno&buscar=dos', 'usuarios: buscar'],
      ['/api/users?rol=docente&rol=estudiante', 'usuarios: rol'],
      ['/api/contents?buscar=a&buscar=b', 'contenidos: buscar'],
      ['/api/contents?tipo=video&tipo=audio', 'contenidos: tipo'],
      ['/api/courses?buscar=a&buscar=b', 'cursos: buscar'],
      ['/api/courses?grado=a&grado=b', 'cursos: grado'],
    ];

    for (const [ruta, descripcion] of casos) {
      test(`${descripcion} no revienta`, async () => {
        const res = await request(app).get(ruta).set(con());
        assert.notEqual(res.status, 500, `${ruta} devolvio 500`);
        assert.ok(res.status < 500);
      });
    }
  });

  test('una paginacion absurda no rompe ni agota la base', async () => {
    const grande = await request(app).get('/api/users?limite=999999').set(con());
    const negativa = await request(app).get('/api/users?pagina=-5&limite=-1').set(con());

    assert.equal(grande.status, 200);
    assert.ok(grande.body.paginacion.limite <= 100, 'el limite debe estar acotado');
    assert.equal(negativa.status, 200);
    assert.equal(negativa.body.paginacion.pagina, 1);
  });

  test('un identificador no numerico responde 400', async () => {
    const res = await request(app).get('/api/users/abc').set(con());
    assert.equal(res.status, 400);
  });

  test('una ruta inexistente responde 404 en json', async () => {
    const res = await request(app).get('/api/no-existe');
    assert.equal(res.status, 404);
    assert.equal(res.body.estado, 'error');
  });

  test('ningun error revela detalles internos del servidor', async () => {
    const respuestas = await Promise.all([
      request(app).post('/api/auth/login').send({ correo: {}, contrasena: {} }),
      request(app).get('/api/users/abc').set(con()),
      request(app).get('/api/no-existe'),
    ]);

    for (const res of respuestas) {
      const cuerpo = JSON.stringify(res.body);
      assert.doesNotMatch(cuerpo, /at .*\.js:\d+/, 'no debe filtrar trazas');
      assert.doesNotMatch(cuerpo, /SELECT |INSERT |UPDATE /i, 'no debe filtrar SQL');
      assert.doesNotMatch(cuerpo, /postgresql:\/\//, 'no debe filtrar la cadena de conexion');
    }
  });
});
