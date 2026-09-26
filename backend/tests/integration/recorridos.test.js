// Pruebas de integracion: recorridos completos de la plataforma.
//
// Las pruebas del frontend simulan la API por completo, y las del backend no
// saben que campos lee el frontend. Entre ambas queda un hueco: si un nombre de
// campo cambia en un lado, las 163 pruebas siguen en verde y la aplicacion se
// rompe en el navegador.
//
// Este archivo cubre ese hueco. Recorre la plataforma como lo haria una persona
// y comprueba que cada respuesta trae exactamente los campos que las pantallas
// leen, con el nombre exacto.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app, pool, limpiarBase, crearUsuario, CONTRASENA } = require('../helpers/datos');

// Los nombres van en espanol porque asi esta definido el contrato de la API.
// Un cambio aqui obliga a cambiar el frontend, y esa es justamente la
// dependencia que estas pruebas hacen visible.
function exigeCampos(objeto, campos, donde) {
  for (const campo of campos) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(objeto, campo),
      `Falta el campo "${campo}" en ${donde}. Lo lee el frontend.`
    );
  }
}

describe('Recorridos completos', () => {
  let tokenAdmin;
  let tokenDocente;
  let tokenEstudiante;
  let idDocente;
  let idEstudiante;
  let idCurso;
  let idContenido;

  before(async () => {
    await limpiarBase();
    await pool.query(
      `INSERT INTO establecimiento (nombre) VALUES ('Instituto de prueba')`
    );
    await crearUsuario({ nombre: 'Admin Prueba', correo: 'admin@prueba.gt', idRol: 1 });
  });

  after(async () => { await pool.end(); });

  describe('El administrador monta el curso', () => {
    test('inicia sesión enviando correo y contrasena', async () => {
      // El frontend envia estas dos claves exactas. Enviar email/password
      // devolveria 400 y el inicio de sesion quedaria roto sin que ninguna
      // prueba de las otras suites lo notara.
      const res = await request(app)
        .post('/api/auth/login')
        .send({ correo: 'admin@prueba.gt', contrasena: CONTRASENA });

      assert.equal(res.status, 200);
      exigeCampos(res.body, ['token', 'usuario'], 'la respuesta del inicio de sesión');
      exigeCampos(res.body.usuario, ['id_usuario', 'nombre_completo', 'correo', 'rol'],
        'el usuario del inicio de sesión');

      tokenAdmin = res.body.token;
    });

    test('crea una cuenta de docente', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          nombreCompleto: 'Ana Pérez', correo: 'ana@prueba.gt',
          contrasena: CONTRASENA, idRol: 2,
        });

      assert.equal(res.status, 201);
      exigeCampos(res.body.usuario, ['id_usuario', 'nombre_completo', 'correo', 'rol', 'estado'],
        'el usuario recién creado');
      idDocente = res.body.usuario.id_usuario;
    });

    test('crea una cuenta de estudiante', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          nombreCompleto: 'Pedro López', correo: 'pedro@prueba.gt',
          contrasena: CONTRASENA, idRol: 3,
        });

      assert.equal(res.status, 201);
      idEstudiante = res.body.usuario.id_usuario;
    });

    test('el listado de usuarios trae lo que muestra la tabla', async () => {
      const res = await request(app)
        .get('/api/users?rol=docente&estado=true')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      assert.equal(res.status, 200);
      exigeCampos(res.body, ['usuarios', 'paginacion'], 'el listado de usuarios');
      exigeCampos(res.body.paginacion, ['pagina', 'limite', 'total', 'paginas'], 'la paginación');
      exigeCampos(res.body.usuarios[0], ['id_usuario', 'nombre_completo', 'correo', 'rol', 'estado'],
        'una fila de la tabla de usuarios');

      // El hash jamas debe salir de la base.
      assert.equal(res.body.usuarios[0].contrasena_hash, undefined);
    });

    test('crea el curso y le asigna la docente', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          nombre: 'Matemática I', grado: 'Primero Básico',
          cicloEscolar: 2026, idDocente,
        });

      assert.equal(res.status, 201);
      exigeCampos(res.body.curso, ['id_curso', 'nombre', 'grado', 'ciclo_escolar', 'id_docente'],
        'el curso recién creado');
      idCurso = res.body.curso.id_curso;
    });

    test('inscribe al estudiante', async () => {
      const res = await request(app)
        .post(`/api/courses/${idCurso}/enrollments`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ idEstudiante });

      assert.equal(res.status, 201);
    });
  });

  describe('La docente publica material', () => {
    test('inicia sesión y ve su curso con los conteos', async () => {
      const sesion = await request(app)
        .post('/api/auth/login')
        .send({ correo: 'ana@prueba.gt', contrasena: CONTRASENA });
      tokenDocente = sesion.body.token;

      const res = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${tokenDocente}`);

      assert.equal(res.status, 200);
      exigeCampos(res.body, ['cursos', 'paginacion'], 'el listado de cursos');

      const curso = res.body.cursos[0];
      // "docente", "inscritos" y "contenidos" los muestran las tarjetas del
      // panel; no salen de la tabla curso, sino del JOIN y las subconsultas.
      exigeCampos(curso,
        ['id_curso', 'nombre', 'grado', 'ciclo_escolar', 'docente', 'inscritos', 'contenidos'],
        'la tarjeta de curso');
      assert.equal(curso.inscritos, 1);
      assert.equal(curso.docente, 'Ana Pérez');
    });

    test('publica un material en su curso', async () => {
      const res = await request(app)
        .post('/api/contents')
        .set('Authorization', `Bearer ${tokenDocente}`)
        .send({
          idCurso, titulo: 'Suma de fracciones', tipo: 'video',
          urlArchivo: 'https://ejemplo.gt/clase.mp4', duracionSeg: 600,
        });

      assert.equal(res.status, 201);
      exigeCampos(res.body.contenido,
        ['id_contenido', 'id_curso', 'titulo', 'tipo', 'url_archivo', 'duracion_seg', 'estado'],
        'el material recién creado');
      idContenido = res.body.contenido.id_contenido;
    });

    test('consulta los inscritos de su curso', async () => {
      const res = await request(app)
        .get(`/api/courses/${idCurso}/enrollments`)
        .set('Authorization', `Bearer ${tokenDocente}`);

      assert.equal(res.status, 200);
      exigeCampos(res.body, ['inscritos', 'total'], 'el listado de inscritos');
      exigeCampos(res.body.inscritos[0], ['id_usuario', 'nombre_completo', 'correo', 'estado'],
        'un inscrito');
    });
  });

  describe('El estudiante consume la clase', () => {
    test('inicia sesión y ve solo su curso', async () => {
      const sesion = await request(app)
        .post('/api/auth/login')
        .send({ correo: 'pedro@prueba.gt', contrasena: CONTRASENA });
      tokenEstudiante = sesion.body.token;

      const res = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${tokenEstudiante}`);

      assert.equal(res.body.paginacion.total, 1);
      assert.equal(res.body.cursos[0].id_curso, idCurso);
    });

    test('ve el material del curso', async () => {
      const res = await request(app)
        .get(`/api/contents?curso=${idCurso}`)
        .set('Authorization', `Bearer ${tokenEstudiante}`);

      assert.equal(res.status, 200);
      exigeCampos(res.body, ['contenidos', 'paginacion'], 'el listado de materiales');
      // "curso" viene del JOIN y lo usan las migas de pan de la pantalla
      // del material.
      exigeCampos(res.body.contenidos[0],
        ['id_contenido', 'id_curso', 'titulo', 'tipo', 'url_archivo', 'duracion_seg', 'estado', 'curso'],
        'una tarjeta de material');
    });

    test('lee la transcripción con sus subtítulos', async () => {
      // La transcripcion se inserta directamente: generarla exigiria la clave
      // de Whisper, y lo que se prueba aqui es el contrato, no el proveedor.
      const t = await pool.query(
        `INSERT INTO transcripcion (id_contenido, texto_completo, estado_revision)
         VALUES ($1, 'Hoy veremos fracciones.', 'revisada') RETURNING id_transcripcion`,
        [idContenido]
      );
      await pool.query(
        `INSERT INTO subtitulo (id_transcripcion, segmento_texto, tiempo_inicio, tiempo_fin)
         VALUES ($1, 'Hoy veremos fracciones.', 0, 3.5)`,
        [t.rows[0].id_transcripcion]
      );

      const res = await request(app)
        .get(`/api/contents/${idContenido}/transcription`)
        .set('Authorization', `Bearer ${tokenEstudiante}`);

      assert.equal(res.status, 200);
      exigeCampos(res.body, ['transcripcion', 'subtitulos'], 'la transcripción');
      exigeCampos(res.body.transcripcion,
        ['id_transcripcion', 'texto_completo', 'estado_revision'], 'la transcripción');
      exigeCampos(res.body.subtitulos[0],
        ['id_subtitulo', 'segmento_texto', 'tiempo_inicio', 'tiempo_fin', 'editado_docente'],
        'un subtítulo');

      // Los tiempos llegan como texto, no como numero: PostgreSQL devuelve
      // NUMERIC asi. El generador de WebVTT del frontend lo tiene en cuenta, y
      // si eso cambiara, los subtitulos se descartarian sin aviso.
      assert.equal(typeof res.body.subtitulos[0].tiempo_inicio, 'string',
        'los tiempos deben llegar como texto: el frontend los convierte');
    });

    test('el historial del asistente trae lo que pinta el chat', async () => {
      const res = await request(app)
        .get(`/api/tutor/consultations?contenido=${idContenido}`)
        .set('Authorization', `Bearer ${tokenEstudiante}`);

      assert.equal(res.status, 200);
      exigeCampos(res.body, ['consultas', 'paginacion'], 'el historial del asistente');
    });
  });

  describe('El contrato de los errores', () => {
    test('todo error trae estado y mensaje', async () => {
      const respuestas = await Promise.all([
        request(app).get('/api/users').set('Authorization', `Bearer ${tokenEstudiante}`),
        request(app).get('/api/users/999999').set('Authorization', `Bearer ${tokenAdmin}`),
        request(app).post('/api/auth/login').send({ correo: 'x@y.gt', contrasena: 'mala1234' }),
      ]);

      for (const res of respuestas) {
        // El frontend lee error.mensaje para mostrarlo al usuario. Sin ese
        // campo mostraria "Ocurrio un error inesperado" en todos los casos.
        exigeCampos(res.body, ['estado', 'mensaje'], `la respuesta ${res.status}`);
        assert.equal(res.body.estado, 'error');
      }
    });

    test('los errores de validación traen el detalle por campo', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nombreCompleto: 'X', correo: 'no-es-correo', contrasena: '123' });

      assert.equal(res.status, 400);
      exigeCampos(res.body, ['estado', 'mensaje', 'errores'], 'el error de validación');
      assert.ok(Array.isArray(res.body.errores));
    });
  });
});
