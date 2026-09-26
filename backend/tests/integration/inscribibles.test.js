// Pruebas del listado de estudiantes disponibles para inscribir.
//
// Va en archivo propio porque el ejecutor de Node aisla cada uno en su proceso:
// compartirlo con otra suite significaria compartir el pool de conexiones, y el
// primer cierre dejaria al resto sin base.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, pool, sembrarEscenario, iniciarSesion } = require('../helpers/datos');

describe('Estudiantes disponibles para inscribir', () => {
  let datos;
  let tokenDocente;
  let tokenDocenteAjeno;
  let tokenEstudiante;

  before(async () => {
    datos = await sembrarEscenario();
    tokenDocente = await iniciarSesion('docente1@prueba.gt');
    tokenDocenteAjeno = await iniciarSesion('docente2@prueba.gt');
    tokenEstudiante = await iniciarSesion('alumno1@prueba.gt');
  });

  after(async () => { await pool.end(); });

  const con = (token) => ({ Authorization: `Bearer ${token}` });

  test('el docente titular ve a quién puede inscribir', async () => {
    const res = await request(app)
      .get(`/api/courses/${datos.curso}/available-students`)
      .set(con(tokenDocente));

    assert.equal(res.status, 200);
    // El docente no tiene acceso al listado general de usuarios; sin este
    // endpoint el desplegable de inscripción quedaría vacío y deshabilitado,
    // sin explicar por qué.
    assert.ok(Array.isArray(res.body.estudiantes));
  });

  test('no ofrece a quien ya está inscrito', async () => {
    const disponibles = await request(app)
      .get(`/api/courses/${datos.curso}/available-students`)
      .set(con(tokenDocente));

    const ids = disponibles.body.estudiantes.map((e) => e.id_usuario);
    assert.ok(!ids.includes(datos.estudiante), 'el ya inscrito no debe ofrecerse');
  });

  test('un docente ajeno al curso no puede consultarlo', async () => {
    const res = await request(app)
      .get(`/api/courses/${datos.curso}/available-students`)
      .set(con(tokenDocenteAjeno));
    assert.equal(res.status, 403);
  });

  test('el estudiante no puede consultarlo', async () => {
    const res = await request(app)
      .get(`/api/courses/${datos.curso}/available-students`)
      .set(con(tokenEstudiante));
    assert.equal(res.status, 403);
  });

  test('no expone el hash ni el rol de las cuentas', async () => {
    const res = await request(app)
      .get(`/api/courses/${datos.curso}/available-students`)
      .set(con(tokenDocente));

    for (const e of res.body.estudiantes) {
      assert.equal(e.contrasena_hash, undefined);
      // Solo lo necesario para elegir a quién inscribir.
      assert.deepEqual(Object.keys(e).sort(), ['correo', 'id_usuario', 'nombre_completo']);
    }
  });
});
