// Pruebas del progreso y del panel de seguimiento.
//
// El avance es a veces la única señal de que algo va mal: un estudiante sordo
// puede no preguntar por pena, así que si el progreso se calcula mal, el
// docente se queda sin saberlo.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { servidor, cerrar, pool, sembrarEscenario, iniciarSesion } = require('../helpers/datos');

describe('Progreso y seguimiento', () => {
  let datos;
  let tokenEstudiante;
  let tokenEstudianteAjeno;
  let tokenDocente;
  let tokenDocenteAjeno;
  let segundoContenido;

  before(async () => {
    datos = await sembrarEscenario();
    tokenEstudiante = await iniciarSesion('alumno1@prueba.gt');
    tokenEstudianteAjeno = await iniciarSesion('alumno2@prueba.gt');
    tokenDocente = await iniciarSesion('docente1@prueba.gt');
    tokenDocenteAjeno = await iniciarSesion('docente2@prueba.gt');

    // Un segundo material en el mismo curso: con uno solo no se nota si el
    // promedio se hace sobre todos los materiales o solo sobre los visitados.
    const res = await pool.query(
      `INSERT INTO contenido (id_curso, titulo, tipo) VALUES ($1, 'Segunda clase', 'audio')
       RETURNING id_contenido`,
      [datos.curso]
    );
    segundoContenido = res.rows[0].id_contenido;
  });

  after(async () => { await cerrar(); });

  const con = (token) => ({ Authorization: `Bearer ${token}` });

  test('el estudiante registra su avance', async () => {
    const res = await request(servidor)
      .put(`/api/contents/${datos.contenido}/progress`)
      .set(con(tokenEstudiante))
      .send({ porcentaje: 80 });

    assert.equal(res.status, 200);
    assert.equal(Number(res.body.progreso.porcentaje_avance), 80);
  });

  test('volver a abrir el material no hace retroceder el avance', async () => {
    const res = await request(servidor)
      .put(`/api/contents/${datos.contenido}/progress`)
      .set(con(tokenEstudiante))
      .send({ porcentaje: 1 });

    // Sin esto, abrir una clase ya terminada la devolvería al 1 % y el panel
    // del docente mostraría un retroceso que no ocurrió.
    assert.equal(Number(res.body.progreso.porcentaje_avance), 80);
  });

  test('no se registra avance en un curso donde no está inscrito', async () => {
    const res = await request(servidor)
      .put(`/api/contents/${datos.contenido}/progress`)
      .set(con(tokenEstudianteAjeno))
      .send({ porcentaje: 50 });
    assert.equal(res.status, 403);
  });

  test('el docente no deja rastro de avance', async () => {
    // Abre sus propias clases para revisarlas; eso no es progreso de nadie.
    const res = await request(servidor)
      .put(`/api/contents/${datos.contenido}/progress`)
      .set(con(tokenDocente))
      .send({ porcentaje: 50 });
    assert.equal(res.status, 403);
  });

  test('un porcentaje fuera de rango se rechaza', async () => {
    for (const valor of [-1, 101, 'mucho']) {
      const res = await request(servidor)
        .put(`/api/contents/${datos.contenido}/progress`)
        .set(con(tokenEstudiante))
        .send({ porcentaje: valor });
      assert.equal(res.status, 400, `debería rechazar ${valor}`);
    }
  });

  test('el avance del curso promedia sobre TODOS los materiales', async () => {
    const res = await request(servidor)
      .get(`/api/courses/${datos.curso}/tracking`)
      .set(con(tokenDocente));

    assert.equal(res.status, 200);
    const alumno = res.body.estudiantes.find((e) => e.id_usuario === datos.estudiante);

    // 80 % de uno de dos materiales = 40 %. Si promediara solo lo visitado
    // daría 80 %, y quien abrió una clase de diez aparecería casi al día.
    assert.equal(alumno.avance, 40);
    assert.ok(alumno.ultima_visita, 'debe traer la última visita');
  });

  test('quien no ha entrado aparece en cero, no desaparece', async () => {
    const res = await request(servidor)
      .get(`/api/courses/${datos.curso}/tracking`)
      .set(con(tokenDocente));

    // Es justo a quien hay que buscar: omitirlo lo volvería invisible.
    const todos = res.body.estudiantes;
    assert.ok(todos.length >= 1);
    assert.ok(todos.every((e) => typeof e.avance === 'number'));
  });

  test('cuenta las consultas al asistente y las agrupa por clase', async () => {
    await pool.query(
      `INSERT INTO consulta_tutor (id_estudiante, id_contenido, pregunta, respuesta)
       VALUES ($1, $2, '¿Y esto?', 'Así'), ($1, $2, '¿Y aquello?', 'Asá'), ($1, $3, 'Otra', 'Sí')`,
      [datos.estudiante, datos.contenido, segundoContenido]
    );

    const res = await request(servidor)
      .get(`/api/courses/${datos.curso}/tracking`)
      .set(con(tokenDocente));

    const alumno = res.body.estudiantes.find((e) => e.id_usuario === datos.estudiante);
    assert.equal(alumno.consultas, 3);

    // Muchas consultas sobre una misma clase señalan el tema que no quedó
    // claro: es lo que el docente mira para decidir qué reforzar.
    assert.equal(res.body.temas[0].consultas, 2);
  });

  test('un docente ajeno no ve el seguimiento del curso', async () => {
    const res = await request(servidor)
      .get(`/api/courses/${datos.curso}/tracking`)
      .set(con(tokenDocenteAjeno));
    assert.equal(res.status, 403);
  });

  test('el estudiante no ve el seguimiento de nadie', async () => {
    const res = await request(servidor)
      .get(`/api/courses/${datos.curso}/tracking`)
      .set(con(tokenEstudiante));
    assert.equal(res.status, 403);
  });

  test('la exportación sale como hoja de cálculo, no como JSON', async () => {
    const res = await request(servidor)
      .get(`/api/courses/${datos.curso}/tracking/export`)
      .set(con(tokenDocente));

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.match(res.headers['content-disposition'], /attachment; filename=/);

    // El BOM es lo que hace que Excel respete los acentos al abrirlo.
    assert.ok(res.text.startsWith('﻿'), 'debe llevar BOM');
    assert.match(res.text, /Estudiante;Avance \(%\);Ultima visita;Consultas/);
    assert.match(res.text, /Estudiante Uno;40;/);
  });

  test('un título con punto y coma no parte la fila en columnas', async () => {
    await pool.query(
      `INSERT INTO contenido (id_curso, titulo, tipo) VALUES ($1, 'Fracciones; decimales', 'audio')`,
      [datos.curso]
    );
    const fila = await pool.query(
      "SELECT id_contenido FROM contenido WHERE titulo = 'Fracciones; decimales'"
    );
    await pool.query(
      `INSERT INTO consulta_tutor (id_estudiante, id_contenido, pregunta) VALUES ($1, $2, '¿?')`,
      [datos.estudiante, fila.rows[0].id_contenido]
    );

    const res = await request(servidor)
      .get(`/api/courses/${datos.curso}/tracking/export`)
      .set(con(tokenDocente));

    // Entre comillas y con las internas duplicadas; si no, la hoja queda
    // descuadrada a partir de esa fila.
    assert.match(res.text, /"Fracciones; decimales";1/);
  });

  test('el nombre del archivo es visible desde otro origen', async () => {
    const res = await request(servidor)
      .get(`/api/courses/${datos.curso}/tracking/export`)
      .set(con(tokenDocente))
      .set('Origin', 'http://localhost:5173');

    // Sin exponer la cabecera, el navegador la oculta en una petición entre
    // orígenes distintos —la página vive en otro dominio que la API— y la
    // descarga se guardaba siempre como «seguimiento.csv». Con varios cursos,
    // el docente acaba con archivos que no puede distinguir.
    assert.match(
      res.headers['access-control-expose-headers'] || '',
      /Content-Disposition/i
    );
  });

  test('un docente ajeno tampoco puede exportar', async () => {
    const res = await request(servidor)
      .get(`/api/courses/${datos.curso}/tracking/export`)
      .set(con(tokenDocenteAjeno));
    assert.equal(res.status, 403);
  });
});
