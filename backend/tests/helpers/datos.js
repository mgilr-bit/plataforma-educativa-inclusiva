// Utilidades compartidas por las pruebas de integracion.
//
// Cada archivo de pruebas parte de una base limpia y siembra sus propios datos,
// de modo que el orden de ejecucion no altera los resultados.
const bcrypt = require('bcryptjs');
const pool = require('../../src/config/db');
const app = require('../../src/app');
const request = require('supertest');

const CONTRASENA = 'Prueba12345';

// Se vacian las tablas en orden inverso a sus dependencias. RESTART IDENTITY
// deja los contadores en 1, para que los identificadores sean predecibles.
async function limpiarBase() {
  await pool.query(`TRUNCATE TABLE
    consulta_tutor, subtitulo, transcripcion, respuesta_estudiante, pregunta,
    evaluacion, progreso, resumen, notificacion, bitacora, inscripcion,
    contenido, curso, usuario, establecimiento
    RESTART IDENTITY CASCADE`);
}

async function crearUsuario({ nombre, correo, idRol, estado = true }) {
  const hash = await bcrypt.hash(CONTRASENA, 4); // coste bajo: son pruebas
  const resultado = await pool.query(
    `INSERT INTO usuario (nombre_completo, correo, contrasena_hash, id_rol, estado)
     VALUES ($1, LOWER($2), $3, $4, $5) RETURNING id_usuario`,
    [nombre, correo, hash, idRol, estado]
  );
  return resultado.rows[0].id_usuario;
}

async function iniciarSesion(correo) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo, contrasena: CONTRASENA });
  return respuesta.body.token;
}

// Escenario base: un administrador, dos docentes con un curso cada uno, dos
// estudiantes (uno inscrito y otro no) y un contenido por curso.
async function sembrarEscenario() {
  await limpiarBase();

  const admin = await crearUsuario({ nombre: 'Admin Prueba', correo: 'admin@prueba.gt', idRol: 1 });
  const docente = await crearUsuario({ nombre: 'Docente Uno', correo: 'docente1@prueba.gt', idRol: 2 });
  const docenteAjeno = await crearUsuario({ nombre: 'Docente Dos', correo: 'docente2@prueba.gt', idRol: 2 });
  const estudiante = await crearUsuario({ nombre: 'Estudiante Uno', correo: 'alumno1@prueba.gt', idRol: 3 });
  const estudianteAjeno = await crearUsuario({ nombre: 'Estudiante Dos', correo: 'alumno2@prueba.gt', idRol: 3 });

  const cursos = await pool.query(
    `INSERT INTO curso (nombre, grado, ciclo_escolar, id_docente)
     VALUES ('Matematica', 'Primero Basico', 2026, $1),
            ('Ciencias', 'Segundo Basico', 2026, $2)
     RETURNING id_curso`,
    [docente, docenteAjeno]
  );
  const curso = cursos.rows[0].id_curso;
  const cursoAjeno = cursos.rows[1].id_curso;

  await pool.query('INSERT INTO inscripcion (id_estudiante, id_curso) VALUES ($1, $2)', [estudiante, curso]);

  const contenidos = await pool.query(
    `INSERT INTO contenido (id_curso, titulo, tipo)
     VALUES ($1, 'Fracciones', 'video'), ($2, 'El agua', 'documento')
     RETURNING id_contenido`,
    [curso, cursoAjeno]
  );

  return {
    admin,
    docente,
    docenteAjeno,
    estudiante,
    estudianteAjeno,
    curso,
    cursoAjeno,
    contenido: contenidos.rows[0].id_contenido,
    contenidoAjeno: contenidos.rows[1].id_contenido,
  };
}

module.exports = {
  CONTRASENA,
  limpiarBase,
  crearUsuario,
  iniciarSesion,
  sembrarEscenario,
  pool,
  app,
};
