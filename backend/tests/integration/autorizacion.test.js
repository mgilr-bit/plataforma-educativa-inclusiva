// Pruebas de integracion del control de acceso.
//
// Son las mas valiosas del conjunto: fijan quien puede ver y modificar que.
// Un fallo aqui expone datos de estudiantes o permite que alguien se ascienda.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, pool, sembrarEscenario, iniciarSesion } = require('../helpers/datos');

describe('Control de acceso', () => {
  let datos;
  let tokenAdmin;
  let tokenDocente;
  let tokenDocenteAjeno;
  let tokenEstudiante;
  let tokenEstudianteAjeno;

  before(async () => {
    datos = await sembrarEscenario();
    tokenAdmin = await iniciarSesion('admin@prueba.gt');
    tokenDocente = await iniciarSesion('docente1@prueba.gt');
    tokenDocenteAjeno = await iniciarSesion('docente2@prueba.gt');
    tokenEstudiante = await iniciarSesion('alumno1@prueba.gt');
    tokenEstudianteAjeno = await iniciarSesion('alumno2@prueba.gt');
  });

  after(async () => { await pool.end(); });

  const con = (token) => ({ Authorization: `Bearer ${token}` });

  describe('Usuarios', () => {
    test('solo el administrador lista usuarios', async () => {
      assert.equal((await request(app).get('/api/users').set(con(tokenAdmin))).status, 200);
      assert.equal((await request(app).get('/api/users').set(con(tokenDocente))).status, 403);
      assert.equal((await request(app).get('/api/users').set(con(tokenEstudiante))).status, 403);
    });

    test('el listado nunca expone el hash de la contrasena', async () => {
      const res = await request(app).get('/api/users').set(con(tokenAdmin));
      for (const usuario of res.body.usuarios) {
        assert.equal(usuario.contrasena_hash, undefined);
      }
    });

    test('un usuario se consulta a si mismo, pero no a otro', async () => {
      const propio = await request(app).get(`/api/users/${datos.estudiante}`).set(con(tokenEstudiante));
      const ajeno = await request(app).get(`/api/users/${datos.docente}`).set(con(tokenEstudiante));
      assert.equal(propio.status, 200);
      assert.equal(ajeno.status, 403);
    });

    test('un estudiante no puede ascenderse a administrador', async () => {
      const res = await request(app)
        .patch(`/api/users/${datos.estudiante}`)
        .set(con(tokenEstudiante))
        .send({ idRol: 1 });

      assert.equal(res.status, 403);

      // Y el rol sigue intacto en la base.
      const fila = await pool.query('SELECT id_rol FROM usuario WHERE id_usuario = $1', [datos.estudiante]);
      assert.equal(fila.rows[0].id_rol, 3);
    });

    test('un administrador no puede desactivarse a si mismo', async () => {
      const porBorrado = await request(app).delete(`/api/users/${datos.admin}`).set(con(tokenAdmin));
      const porEdicion = await request(app)
        .patch(`/api/users/${datos.admin}`)
        .set(con(tokenAdmin))
        .send({ estado: false });

      assert.equal(porBorrado.status, 409);
      assert.equal(porEdicion.status, 409);
    });

    test('la baja de usuario es logica, no fisica', async () => {
      const res = await request(app).delete(`/api/users/${datos.estudianteAjeno}`).set(con(tokenAdmin));
      assert.equal(res.status, 200);

      const fila = await pool.query('SELECT estado FROM usuario WHERE id_usuario = $1', [datos.estudianteAjeno]);
      assert.equal(fila.rowCount, 1, 'la fila debe seguir existiendo');
      assert.equal(fila.rows[0].estado, false);

      await pool.query('UPDATE usuario SET estado = TRUE WHERE id_usuario = $1', [datos.estudianteAjeno]);
    });
  });

  describe('Cursos', () => {
    test('cada rol ve solo los cursos que le corresponden', async () => {
      const admin = await request(app).get('/api/courses').set(con(tokenAdmin));
      const docente = await request(app).get('/api/courses').set(con(tokenDocente));
      const estudiante = await request(app).get('/api/courses').set(con(tokenEstudiante));
      const ajeno = await request(app).get('/api/courses').set(con(tokenEstudianteAjeno));

      assert.equal(admin.body.paginacion.total, 2);
      assert.equal(docente.body.paginacion.total, 1);
      assert.equal(docente.body.cursos[0].id_curso, datos.curso);
      assert.equal(estudiante.body.paginacion.total, 1, 'solo el curso donde esta inscrito');
      assert.equal(ajeno.body.paginacion.total, 0, 'sin inscripciones no ve nada');
    });

    test('solo el administrador crea cursos', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set(con(tokenDocente))
        .send({ nombre: 'X', grado: 'Y', cicloEscolar: 2026, idDocente: datos.docente });
      assert.equal(res.status, 403);
    });

    test('no se puede asignar un curso a quien no es docente', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set(con(tokenAdmin))
        .send({ nombre: 'X', grado: 'Y', cicloEscolar: 2026, idDocente: datos.estudiante });
      assert.equal(res.status, 400);
    });

    test('un docente no puede reasignar su curso a otro', async () => {
      const res = await request(app)
        .patch(`/api/courses/${datos.curso}`)
        .set(con(tokenDocente))
        .send({ idDocente: datos.docenteAjeno });
      assert.equal(res.status, 403);
    });

    test('un docente no modifica el curso de otro', async () => {
      const res = await request(app)
        .patch(`/api/courses/${datos.cursoAjeno}`)
        .set(con(tokenDocente))
        .send({ nombre: 'Secuestrado' });
      assert.equal(res.status, 403);
    });

    test('no se inscribe a alguien que no es estudiante', async () => {
      const res = await request(app)
        .post(`/api/courses/${datos.curso}/enrollments`)
        .set(con(tokenDocente))
        .send({ idEstudiante: datos.docenteAjeno });
      assert.equal(res.status, 400);
    });

    test('no se duplica una inscripcion', async () => {
      const res = await request(app)
        .post(`/api/courses/${datos.curso}/enrollments`)
        .set(con(tokenDocente))
        .send({ idEstudiante: datos.estudiante });
      assert.equal(res.status, 409);
    });
  });

  describe('Contenidos', () => {
    test('cada rol ve solo los contenidos que le corresponden', async () => {
      const admin = await request(app).get('/api/contents').set(con(tokenAdmin));
      const docente = await request(app).get('/api/contents').set(con(tokenDocente));
      const estudiante = await request(app).get('/api/contents').set(con(tokenEstudiante));
      const ajeno = await request(app).get('/api/contents').set(con(tokenEstudianteAjeno));

      assert.equal(admin.body.paginacion.total, 2);
      assert.equal(docente.body.paginacion.total, 1);
      assert.equal(estudiante.body.paginacion.total, 1);
      assert.equal(ajeno.body.paginacion.total, 0);
    });

    test('un contenido ajeno responde 404, no 403: no se revela que existe', async () => {
      const res = await request(app)
        .get(`/api/contents/${datos.contenidoAjeno}`)
        .set(con(tokenEstudiante));
      assert.equal(res.status, 404);
    });

    test('un docente no carga contenido en el curso de otro', async () => {
      const res = await request(app)
        .post('/api/contents')
        .set(con(tokenDocente))
        .send({ idCurso: datos.cursoAjeno, titulo: 'Intruso', tipo: 'texto' });
      assert.equal(res.status, 403);
    });

    test('el tipo de contenido esta acotado por el esquema', async () => {
      const res = await request(app)
        .post('/api/contents')
        .set(con(tokenDocente))
        .send({ idCurso: datos.curso, titulo: 'X', tipo: 'pdf' });
      assert.equal(res.status, 400);
    });

    test('el estudiante no crea contenidos', async () => {
      const res = await request(app)
        .post('/api/contents')
        .set(con(tokenEstudiante))
        .send({ idCurso: datos.curso, titulo: 'X', tipo: 'texto' });
      assert.equal(res.status, 403);
    });

    test('al retirar un contenido el estudiante deja de verlo, pero el docente no', async () => {
      await request(app).delete(`/api/contents/${datos.contenido}`).set(con(tokenDocente));

      const estudiante = await request(app).get('/api/contents').set(con(tokenEstudiante));
      const docente = await request(app).get('/api/contents').set(con(tokenDocente));

      assert.equal(estudiante.body.paginacion.total, 0);
      assert.equal(docente.body.paginacion.total, 1);
      assert.equal(docente.body.contenidos[0].estado, false);

      // El historial academico depende de esta fila: no debe borrarse.
      const fila = await pool.query('SELECT 1 FROM contenido WHERE id_contenido = $1', [datos.contenido]);
      assert.equal(fila.rowCount, 1);

      await request(app)
        .patch(`/api/contents/${datos.contenido}`)
        .set(con(tokenDocente))
        .send({ estado: true });
    });
  });
});
