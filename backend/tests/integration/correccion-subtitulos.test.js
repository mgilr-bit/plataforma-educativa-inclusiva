// Pruebas de la corrección de subtítulos por el docente.
//
// El estudiante lee los segmentos y el asistente lee el texto completo: son
// dos copias del mismo contenido. Si se corrige una y no la otra, el docente
// arregla los subtítulos y el asistente sigue respondiendo con lo que Whisper
// oyó mal, sin que nadie se entere.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, pool, sembrarEscenario, iniciarSesion } = require('../helpers/datos');

describe('Corrección de subtítulos', () => {
  let datos;
  let tokenDocente;
  let tokenDocenteAjeno;
  let tokenEstudiante;
  let idTranscripcion;
  let idSubtitulo;

  async function sembrarTranscripcion() {
    const t = await pool.query(
      `INSERT INTO transcripcion (id_contenido, texto_completo)
       VALUES ($1, 'Uno. Dos. Tres.') RETURNING id_transcripcion`,
      [datos.contenido]
    );
    const id = t.rows[0].id_transcripcion;
    const s = await pool.query(
      `INSERT INTO subtitulo (id_transcripcion, segmento_texto, tiempo_inicio, tiempo_fin)
       VALUES ($1, 'Uno.', 0, 1), ($1, 'Dos.', 1, 2), ($1, 'Tres.', 2, 3)
       RETURNING id_subtitulo`,
      [id]
    );
    return { idTranscripcion: id, idSubtitulo: s.rows[0].id_subtitulo };
  }

  before(async () => {
    datos = await sembrarEscenario();
    tokenDocente = await iniciarSesion('docente1@prueba.gt');
    tokenDocenteAjeno = await iniciarSesion('docente2@prueba.gt');
    tokenEstudiante = await iniciarSesion('alumno1@prueba.gt');
    ({ idTranscripcion, idSubtitulo } = await sembrarTranscripcion());
  });

  after(async () => { await pool.end(); });

  const con = (token) => ({ Authorization: `Bearer ${token}` });

  test('corregir un segmento rehace el texto que lee el asistente', async () => {
    const res = await request(app)
      .patch(`/api/subtitles/${idSubtitulo}`)
      .set(con(tokenDocente))
      .send({ segmentoTexto: 'Mínimo común múltiplo.' });

    assert.equal(res.status, 200);
    assert.equal(res.body.subtitulo.editado_docente, true);

    const fila = await pool.query(
      'SELECT texto_completo FROM transcripcion WHERE id_transcripcion = $1',
      [idTranscripcion]
    );
    // Sin esto, el estudiante leería la corrección y el asistente seguiría
    // contestando con el error de Whisper.
    assert.equal(fila.rows[0].texto_completo, 'Mínimo común múltiplo. Dos. Tres.');
  });

  test('el texto se rehace en el orden de los tiempos, no en el de edición', async () => {
    const todos = await pool.query(
      'SELECT id_subtitulo FROM subtitulo WHERE id_transcripcion = $1 ORDER BY tiempo_inicio',
      [idTranscripcion]
    );
    const ultimo = todos.rows[2].id_subtitulo;

    await request(app)
      .patch(`/api/subtitles/${ultimo}`)
      .set(con(tokenDocente))
      .send({ segmentoTexto: 'Final.' });

    const fila = await pool.query(
      'SELECT texto_completo FROM transcripcion WHERE id_transcripcion = $1',
      [idTranscripcion]
    );
    assert.equal(fila.rows[0].texto_completo, 'Mínimo común múltiplo. Dos. Final.');
  });

  test('un docente ajeno al curso no puede corregir', async () => {
    const res = await request(app)
      .patch(`/api/subtitles/${idSubtitulo}`)
      .set(con(tokenDocenteAjeno))
      .send({ segmentoTexto: 'No debería entrar.' });

    assert.equal(res.status, 403);
  });

  test('el estudiante tampoco', async () => {
    const res = await request(app)
      .patch(`/api/subtitles/${idSubtitulo}`)
      .set(con(tokenEstudiante))
      .send({ segmentoTexto: 'No debería entrar.' });

    assert.equal(res.status, 403);
  });

  test('un segmento no puede quedar vacío', async () => {
    const res = await request(app)
      .patch(`/api/subtitles/${idSubtitulo}`)
      .set(con(tokenDocente))
      .send({ segmentoTexto: '   ' });

    // Un segmento vacío dejaría un hueco mudo en los subtítulos, que para
    // quien no oye es contenido perdido sin aviso.
    assert.equal(res.status, 400);
  });

  test('el docente marca la transcripción como revisada', async () => {
    const res = await request(app)
      .patch(`/api/transcriptions/${idTranscripcion}`)
      .set(con(tokenDocente))
      .send({ estadoRevision: 'aprobada' });

    assert.equal(res.status, 200);
    assert.equal(res.body.transcripcion.estado_revision, 'aprobada');
  });
});
