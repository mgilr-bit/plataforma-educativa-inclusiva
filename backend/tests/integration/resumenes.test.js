// Pruebas de los permisos y la lectura de los resúmenes.
//
// No se genera ninguno de verdad: eso llamaría a la API de pago. Lo que se
// comprueba aquí es quién puede tocarlos y qué ve cada quien.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, pool, sembrarEscenario, iniciarSesion } = require('../helpers/datos');

describe('Resúmenes en lenguaje sencillo', () => {
  let datos;
  let tokenDocente;
  let tokenDocenteAjeno;
  let tokenEstudiante;
  let idResumen;

  before(async () => {
    datos = await sembrarEscenario();
    tokenDocente = await iniciarSesion('docente1@prueba.gt');
    tokenDocenteAjeno = await iniciarSesion('docente2@prueba.gt');
    tokenEstudiante = await iniciarSesion('alumno1@prueba.gt');

    const res = await pool.query(
      `INSERT INTO resumen (id_contenido, texto_resumen, nivel_simplificacion)
       VALUES ($1, '## De que trata\nEl agua se mueve.', 'basico')
       RETURNING id_resumen`,
      [datos.contenido]
    );
    idResumen = res.rows[0].id_resumen;
  });

  after(async () => { await pool.end(); });

  const con = (token) => ({ Authorization: `Bearer ${token}` });

  test('el estudiante puede leerlo', async () => {
    const res = await request(app)
      .get(`/api/contents/${datos.contenido}/summaries`)
      .set(con(tokenEstudiante));

    // Es su puerta de entrada a la clase: si no lo pudiera leer, no serviría
    // de nada haberlo generado.
    assert.equal(res.status, 200);
    assert.equal(res.body.resumenes.length, 1);
    assert.equal(res.body.resumenes[0].nivel_simplificacion, 'basico');
  });

  test('el estudiante no puede generarlo ni borrarlo', async () => {
    const generar = await request(app)
      .post(`/api/contents/${datos.contenido}/summary`)
      .set(con(tokenEstudiante))
      .send({ nivel: 'medio' });
    // Generar cuesta saldo del asistente.
    assert.equal(generar.status, 403);

    const borrar = await request(app)
      .delete(`/api/summaries/${idResumen}`)
      .set(con(tokenEstudiante));
    assert.equal(borrar.status, 403);
  });

  test('un nivel inventado se rechaza antes de llamar al modelo', async () => {
    const res = await request(app)
      .post(`/api/contents/${datos.contenido}/summary`)
      .set(con(tokenDocente))
      .send({ nivel: 'facilito' });

    assert.equal(res.status, 400);
    assert.match(res.body.mensaje, /basico, medio, avanzado/);
  });

  test('no se repite el mismo nivel dos veces', async () => {
    const res = await request(app)
      .post(`/api/contents/${datos.contenido}/summary`)
      .set(con(tokenDocente))
      .send({ nivel: 'basico' });

    // Sin esto se pagaría otra generación para acabar con dos resúmenes
    // iguales y el estudiante sin saber cuál leer.
    assert.equal(res.status, 409);
    assert.equal(res.body.idResumen, idResumen);
  });

  test('sin transcripción no se genera, y se dice por qué', async () => {
    const res = await request(app)
      .post(`/api/contents/${datos.contenido}/summary`)
      .set(con(tokenDocente))
      .send({ nivel: 'medio' });

    // El contenido sembrado no tiene transcripción.
    assert.equal(res.status, 409);
    assert.match(res.body.mensaje, /transcripcion/i);
  });

  test('el docente titular corrige el resumen', async () => {
    const res = await request(app)
      .patch(`/api/summaries/${idResumen}`)
      .set(con(tokenDocente))
      .send({ textoResumen: '## De que trata\nTexto corregido por el docente.' });

    // La máquina también se equivoca; si nadie puede arreglarlo, el error
    // llega al estudiante tal cual.
    assert.equal(res.status, 200);
    assert.match(res.body.resumen.texto_resumen, /corregido por el docente/);
  });

  test('no se puede dejar vacío', async () => {
    const res = await request(app)
      .patch(`/api/summaries/${idResumen}`)
      .set(con(tokenDocente))
      .send({ textoResumen: '   ' });
    assert.equal(res.status, 400);
  });

  test('un docente ajeno no puede corregirlo ni borrarlo', async () => {
    const corregir = await request(app)
      .patch(`/api/summaries/${idResumen}`)
      .set(con(tokenDocenteAjeno))
      .send({ textoResumen: 'No debería' });
    assert.equal(corregir.status, 403);

    const borrar = await request(app)
      .delete(`/api/summaries/${idResumen}`)
      .set(con(tokenDocenteAjeno));
    assert.equal(borrar.status, 403);
  });

  test('borrarlo lo quita de verdad, para poder generar otro', async () => {
    const res = await request(app)
      .delete(`/api/summaries/${idResumen}`)
      .set(con(tokenDocente));

    assert.equal(res.status, 200);
    // A diferencia del contenido, nada depende de un resumen: una marca
    // lógica solo impediría generar otro en el mismo nivel.
    const fila = await pool.query('SELECT 1 FROM resumen WHERE id_resumen = $1', [idResumen]);
    assert.equal(fila.rowCount, 0);
  });
});
