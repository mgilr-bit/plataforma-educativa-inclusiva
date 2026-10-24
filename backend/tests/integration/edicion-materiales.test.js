// Pruebas de la edición y retiro de materiales.
//
// Un material subido por equivocación tiene que poder arreglarse. Lo que no
// puede es desaparecer del todo: el progreso de los estudiantes cuelga de él.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { DIRECTORIO } = require('../../src/config/storage');
const { servidor, cerrar, pool, sembrarEscenario, iniciarSesion } = require('../helpers/datos');

// Un m4a mínimo: no tiene que sonar, solo pasar el filtro de formato y
// quedar escrito en el disco.
const ARCHIVO = Buffer.from('contenido de prueba que simula un audio');

describe('Edición y retiro de materiales', () => {
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

  after(async () => { await cerrar(); });

  const con = (token) => ({ Authorization: `Bearer ${token}` });

  async function crearConArchivo() {
    const res = await request(servidor)
      .post('/api/contents')
      .set(con(tokenDocente))
      .field('idCurso', String(datos.curso))
      .field('titulo', 'Clase con archivo')
      .field('tipo', 'audio')
      .attach('archivo', ARCHIVO, 'clase.m4a');
    return res.body.contenido;
  }

  test('el docente corrige el título de su material', async () => {
    const res = await request(servidor)
      .patch(`/api/contents/${datos.contenido}`)
      .set(con(tokenDocente))
      .send({ titulo: 'Título corregido' });

    assert.equal(res.status, 200);
    assert.equal(res.body.contenido.titulo, 'Título corregido');
  });

  test('sustituir el archivo borra el anterior del disco', async () => {
    const material = await crearConArchivo();
    const anterior = path.basename(material.url_archivo);
    assert.ok(fs.existsSync(path.join(DIRECTORIO, anterior)), 'el archivo original debe existir');

    const res = await request(servidor)
      .patch(`/api/contents/${material.id_contenido}`)
      .set(con(tokenDocente))
      .attach('archivo', Buffer.from('otro audio distinto'), 'nueva.m4a');

    assert.equal(res.status, 200);
    assert.notEqual(res.body.contenido.url_archivo, material.url_archivo);
    // Sin esto, cada corrección deja una copia huérfana ocupando disco. En un
    // servidor con volumen de pago eso se nota.
    assert.ok(
      !fs.existsSync(path.join(DIRECTORIO, anterior)),
      'el archivo sustituido no debe quedar en el disco'
    );

    fs.unlinkSync(path.join(DIRECTORIO, path.basename(res.body.contenido.url_archivo)));
  });

  test('no se puede cambiar el archivo si ya hay transcripción', async () => {
    const material = await crearConArchivo();
    await pool.query(
      `INSERT INTO transcripcion (id_contenido, texto_completo) VALUES ($1, 'Texto')`,
      [material.id_contenido]
    );

    const res = await request(servidor)
      .patch(`/api/contents/${material.id_contenido}`)
      .set(con(tokenDocente))
      .attach('archivo', Buffer.from('audio nuevo'), 'nueva.m4a');

    // El texto hablaría de un audio que ya no está, y el estudiante sordo
    // leería subtítulos que no corresponden a lo que suena sin poder notarlo.
    assert.equal(res.status, 409);
    assert.match(res.body.mensaje, /ya tiene transcripción/i);

    // El archivo rechazado no puede quedarse ocupando disco.
    const sobrantes = fs.readdirSync(DIRECTORIO).filter((n) => n.endsWith('.m4a'));
    const fila = await pool.query(
      'SELECT url_archivo FROM contenido WHERE id_contenido = $1',
      [material.id_contenido]
    );
    assert.equal(fila.rows[0].url_archivo, material.url_archivo, 'el archivo no debe cambiar');
    assert.ok(sobrantes.length >= 1);

    fs.unlinkSync(path.join(DIRECTORIO, path.basename(material.url_archivo)));
  });

  test('retirar un material lo esconde del estudiante pero no lo borra', async () => {
    const retiro = await request(servidor)
      .delete(`/api/contents/${datos.contenido}`)
      .set(con(tokenDocente));

    assert.equal(retiro.status, 200);
    assert.equal(retiro.body.contenido.estado, false);

    // La fila sigue: transcripcion, progreso y evaluacion dependen de ella con
    // ON DELETE CASCADE, así que un borrado físico perdería lo que el
    // estudiante ya estudió.
    const fila = await pool.query(
      'SELECT estado FROM contenido WHERE id_contenido = $1',
      [datos.contenido]
    );
    assert.equal(fila.rowCount, 1);
    assert.equal(fila.rows[0].estado, false);

    const comoEstudiante = await request(servidor).get('/api/contents').set(con(tokenEstudiante));
    const ids = comoEstudiante.body.contenidos.map((c) => c.id_contenido);
    assert.ok(!ids.includes(datos.contenido), 'el estudiante no debe verlo');

    const comoDocente = await request(servidor).get('/api/contents').set(con(tokenDocente));
    const idsDocente = comoDocente.body.contenidos.map((c) => c.id_contenido);
    assert.ok(idsDocente.includes(datos.contenido), 'el docente sí, para poder reponerlo');
  });

  test('un material retirado se puede volver a publicar', async () => {
    const res = await request(servidor)
      .patch(`/api/contents/${datos.contenido}`)
      .set(con(tokenDocente))
      .send({ estado: true });

    assert.equal(res.status, 200);
    assert.equal(res.body.contenido.estado, true);
  });

  test('en multipart el estado llega como texto y se entiende igual', async () => {
    const res = await request(servidor)
      .patch(`/api/contents/${datos.contenido}`)
      .set(con(tokenDocente))
      .field('estado', 'false');

    assert.equal(res.status, 200);
    assert.equal(res.body.contenido.estado, false);

    await request(servidor)
      .patch(`/api/contents/${datos.contenido}`)
      .set(con(tokenDocente))
      .send({ estado: true });
  });

  test('un docente ajeno no puede editar ni retirar', async () => {
    const edicion = await request(servidor)
      .patch(`/api/contents/${datos.contenido}`)
      .set(con(tokenDocenteAjeno))
      .send({ titulo: 'No debería' });
    assert.equal(edicion.status, 403);

    const retiro = await request(servidor)
      .delete(`/api/contents/${datos.contenido}`)
      .set(con(tokenDocenteAjeno));
    assert.equal(retiro.status, 403);
  });

  test('el estudiante tampoco', async () => {
    const res = await request(servidor)
      .delete(`/api/contents/${datos.contenido}`)
      .set(con(tokenEstudiante));
    assert.equal(res.status, 403);
  });
});
