// Pruebas del borrado de consultas al asistente.
//
// Archivo propio por la misma razon que el resto: el ejecutor de Node aisla
// cada uno en su proceso, y compartir suite significaria compartir el pool.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, pool, sembrarEscenario, iniciarSesion } = require('../helpers/datos');

describe('Borrado de consultas al asistente', () => {
  let datos;
  let tokenEstudiante;
  let tokenEstudianteAjeno;
  let tokenDocente;

  // Se insertan directamente: la respuesta la genera el asistente real, y una
  // prueba no debe depender de una llamada de pago ni de la red.
  async function sembrarConsulta(idEstudiante) {
    const res = await pool.query(
      `INSERT INTO consulta_tutor (id_estudiante, id_contenido, pregunta, respuesta)
       VALUES ($1, $2, '¿Que es una fraccion?', 'Una fraccion tiene dos partes.')
       RETURNING id_consulta`,
      [idEstudiante, datos.contenido]
    );
    return res.rows[0].id_consulta;
  }

  before(async () => {
    datos = await sembrarEscenario();
    tokenEstudiante = await iniciarSesion('alumno1@prueba.gt');
    tokenEstudianteAjeno = await iniciarSesion('alumno2@prueba.gt');
    tokenDocente = await iniciarSesion('docente1@prueba.gt');
  });

  after(async () => { await pool.end(); });

  const con = (token) => ({ Authorization: `Bearer ${token}` });

  test('el estudiante borra su propia consulta', async () => {
    const id = await sembrarConsulta(datos.estudiante);

    const res = await request(app)
      .delete(`/api/tutor/consultations/${id}`)
      .set(con(tokenEstudiante));

    assert.equal(res.status, 200);
    assert.equal(res.body.estado, 'ok');
  });

  test('el borrado es fisico: el docente deja de verla', async () => {
    const id = await sembrarConsulta(datos.estudiante);

    await request(app).delete(`/api/tutor/consultations/${id}`).set(con(tokenEstudiante));

    // Si fuera una marca logica, el docente seguiria leyendola mientras el
    // estudiante cree que la elimino. Eso es peor que no ofrecer el borrado.
    const fila = await pool.query('SELECT 1 FROM consulta_tutor WHERE id_consulta = $1', [id]);
    assert.equal(fila.rowCount, 0);

    const vistaDocente = await request(app)
      .get('/api/tutor/consultations')
      .set(con(tokenDocente));
    const ids = (vistaDocente.body.consultas || []).map((c) => c.id_consulta);
    assert.ok(!ids.includes(id), 'el docente no debe seguir viendo la consulta borrada');
  });

  test('otro estudiante no puede borrarla, y no se le confirma que existe', async () => {
    const id = await sembrarConsulta(datos.estudiante);

    const res = await request(app)
      .delete(`/api/tutor/consultations/${id}`)
      .set(con(tokenEstudianteAjeno));

    // 404 y no 403: un 403 revelaria que esa consulta existe y es de alguien.
    assert.equal(res.status, 404);
    const fila = await pool.query('SELECT 1 FROM consulta_tutor WHERE id_consulta = $1', [id]);
    assert.equal(fila.rowCount, 1, 'la consulta ajena debe seguir intacta');
  });

  test('el docente no puede borrar la consulta de su estudiante', async () => {
    const id = await sembrarConsulta(datos.estudiante);

    const res = await request(app)
      .delete(`/api/tutor/consultations/${id}`)
      .set(con(tokenDocente));

    assert.equal(res.status, 403);
    const fila = await pool.query('SELECT 1 FROM consulta_tutor WHERE id_consulta = $1', [id]);
    assert.equal(fila.rowCount, 1);
  });

  test('sin sesion no se borra nada', async () => {
    const id = await sembrarConsulta(datos.estudiante);

    const res = await request(app).delete(`/api/tutor/consultations/${id}`);

    assert.equal(res.status, 401);
    const fila = await pool.query('SELECT 1 FROM consulta_tutor WHERE id_consulta = $1', [id]);
    assert.equal(fila.rowCount, 1);
  });

  test('un identificador que no es numero se rechaza sin tocar la base', async () => {
    const res = await request(app)
      .delete('/api/tutor/consultations/abc')
      .set(con(tokenEstudiante));

    assert.equal(res.status, 400);
  });
});
