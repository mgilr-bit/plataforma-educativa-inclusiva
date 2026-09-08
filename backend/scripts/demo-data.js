// Datos de ejemplo para probar la plataforma.
//
// Deja un escenario coherente: un establecimiento, tres docentes, ocho
// estudiantes, cursos con material y una transcripcion con subtitulos.
//
// BORRA todo lo que haya en la base, asi que se niega a ejecutarse contra
// cualquier cosa que no sea una base local. Sin esa comprobacion, un
// DATABASE_URL apuntando a produccion vaciaria la base real.
require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

const CONTRASENAS = {
  administrador: 'Admin12345',
  docente: 'Docente12345',
  estudiante: 'Estudiante12345',
};

// Solo se admiten bases locales. Se comprueba el destino real de la conexion,
// no el nombre de la variable.
function esBaseLocal(url) {
  try {
    const { hostname } = new URL(url);
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return false;
  }
}

async function crearUsuario(cliente, { nombre, correo, idRol, clave }) {
  const hash = await bcrypt.hash(clave, 10);
  const resultado = await cliente.query(
    `INSERT INTO usuario (nombre_completo, correo, contrasena_hash, id_rol, id_establecimiento)
     VALUES ($1, LOWER($2), $3, $4, $5) RETURNING id_usuario`,
    [nombre, correo, hash, idRol, 1]
  );
  return resultado.rows[0].id_usuario;
}

async function main() {
  const url = process.env.DATABASE_URL;

  if (!esBaseLocal(url)) {
    console.error('Este script solo se ejecuta contra una base de datos local.');
    console.error('DATABASE_URL apunta a un servidor remoto y se cancela la operacion.');
    process.exit(1);
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    // Se vacia todo menos los roles, que son parte del modelo.
    await cliente.query(`TRUNCATE TABLE
      consulta_tutor, subtitulo, transcripcion, respuesta_estudiante, pregunta,
      evaluacion, progreso, resumen, notificacion, bitacora, inscripcion,
      contenido, curso, usuario, establecimiento
      RESTART IDENTITY CASCADE`);

    await cliente.query(
      `INSERT INTO establecimiento (nombre, direccion, aldea_zona, telefono)
       VALUES ('Instituto Nacional de Educación Básica', '4a Calle 2-30', 'San Juan Sacatepéquez', '55012345')`
    );

    const admin = await crearUsuario(cliente, {
      nombre: 'Milton Gil', correo: 'admin@umg.edu.gt', idRol: 1, clave: CONTRASENAS.administrador,
    });

    const docentes = {};
    for (const [clave, nombre, correo] of [
      ['ana', 'Ana Pérez García', 'ana@umg.edu.gt'],
      ['luis', 'Luis Morales Sicán', 'luis@umg.edu.gt'],
      ['carmen', 'Carmen Xiloj Curruchiche', 'carmen@umg.edu.gt'],
    ]) {
      docentes[clave] = await crearUsuario(cliente, {
        nombre, correo, idRol: 2, clave: CONTRASENAS.docente,
      });
    }

    const estudiantes = [];
    for (const [nombre, correo] of [
      ['Pedro López Chile', 'pedro@umg.edu.gt'],
      ['Sofía Ramírez Boc', 'sofia@umg.edu.gt'],
      ['Diego Sactic Pirir', 'diego@umg.edu.gt'],
      ['María Cumez Tuy', 'maria@umg.edu.gt'],
      ['José Chalí Raxón', 'jose@umg.edu.gt'],
      ['Lucía Tzoc Ajú', 'lucia@umg.edu.gt'],
      ['Andrés Quiej Sucuc', 'andres@umg.edu.gt'],
      ['Elena Patzán Yol', 'elena@umg.edu.gt'],
    ]) {
      estudiantes.push(await crearUsuario(cliente, {
        nombre, correo, idRol: 3, clave: CONTRASENAS.estudiante,
      }));
    }

    // Un estudiante desactivado, para poder ver ese estado en la interfaz.
    await cliente.query('UPDATE usuario SET estado = FALSE WHERE id_usuario = $1', [estudiantes[7]]);

    const cursos = await cliente.query(
      `INSERT INTO curso (nombre, grado, ciclo_escolar, id_docente) VALUES
        ('Matemática I', 'Primero Básico', 2026, $1),
        ('Comunicación y Lenguaje', 'Primero Básico', 2026, $1),
        ('Ciencias Naturales', 'Segundo Básico', 2026, $2),
        ('Estudios Sociales', 'Segundo Básico', 2026, $3)
       RETURNING id_curso`,
      [docentes.ana, docentes.luis, docentes.carmen]
    );
    const [mate, lengua, ciencias, sociales] = cursos.rows.map((c) => c.id_curso);

    // Inscripciones repartidas: ningun curso queda igual que otro, para que se
    // vean listas de distinto tamano y tambien un curso vacio.
    const inscripciones = [
      [mate, estudiantes.slice(0, 6)],
      [lengua, estudiantes.slice(2, 5)],
      [ciencias, estudiantes.slice(0, 2)],
      [sociales, []],
    ];
    for (const [curso, alumnos] of inscripciones) {
      for (const alumno of alumnos) {
        await cliente.query(
          'INSERT INTO inscripcion (id_estudiante, id_curso) VALUES ($1, $2)',
          [alumno, curso]
        );
      }
    }

    const contenidos = await cliente.query(
      `INSERT INTO contenido (id_curso, titulo, tipo, url_archivo, duracion_seg) VALUES
        ($1, 'Suma y resta de fracciones', 'video', 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4', 596),
        ($1, 'Guía de ejercicios: fracciones', 'documento', NULL, NULL),
        ($1, 'Repaso: mínimo común múltiplo', 'audio', NULL, 240),
        ($2, 'Los tiempos verbales', 'video', NULL, 420),
        ($3, 'El ciclo del agua', 'documento', NULL, NULL)
       RETURNING id_contenido`,
      [mate, lengua, ciencias]
    );
    const fracciones = contenidos.rows[0].id_contenido;

    // Se retira uno, para ver como se comporta la baja logica.
    await cliente.query('UPDATE contenido SET estado = FALSE WHERE id_contenido = $1',
      [contenidos.rows[2].id_contenido]);

    // Transcripcion del video, con sus subtitulos. Uno aparece corregido por la
    // docente, que es el recorrido completo de la plataforma.
    const transcripcion = await cliente.query(
      `INSERT INTO transcripcion (id_contenido, texto_completo, precision_estimada, estado_revision)
       VALUES ($1, $2, 93.50, 'revisada') RETURNING id_transcripcion`,
      [fracciones,
       'Buenos días a todos. Hoy vamos a ver cómo se suman y se restan las fracciones. '
       + 'Primero necesitamos que los denominadores sean iguales. '
       + 'Si son distintos, buscamos el mínimo común múltiplo. '
       + 'Después sumamos solo los numeradores y dejamos el denominador igual.']
    );
    const idTranscripcion = transcripcion.rows[0].id_transcripcion;

    const segmentos = [
      ['Buenos días a todos.', 0, 2.4, true],
      ['Hoy vamos a ver cómo se suman y se restan las fracciones.', 2.4, 8.1, false],
      ['Primero necesitamos que los denominadores sean iguales.', 8.1, 13.7, false],
      ['Si son distintos, buscamos el mínimo común múltiplo.', 13.7, 19.2, false],
      ['Después sumamos solo los numeradores y dejamos el denominador igual.', 19.2, 26.0, false],
    ];
    for (const [texto, inicio, fin, editado] of segmentos) {
      await cliente.query(
        `INSERT INTO subtitulo (id_transcripcion, segmento_texto, tiempo_inicio, tiempo_fin, editado_docente)
         VALUES ($1, $2, $3, $4, $5)`,
        [idTranscripcion, texto, inicio, fin, editado]
      );
    }

    // Consultas previas al asistente, para que el chat no aparezca vacio.
    await cliente.query(
      `INSERT INTO consulta_tutor (id_estudiante, id_contenido, pregunta, respuesta) VALUES
        ($1, $2, $3, $4), ($1, $2, $5, $6)`,
      [estudiantes[0], fracciones,
       'No entendí qué es el denominador.',
       'El denominador es el número de abajo de la fracción.\n\n'
       + '1. Dice en cuántas partes iguales se corta el entero.\n'
       + '2. El de arriba, el numerador, dice cuántas partes tomamos.\n\n'
       + 'Ejemplo: en 3/4, el denominador es 4. La tortilla se cortó en 4 partes.\n\n'
       + '¿Qué denominador tendría media tortilla?',
       '¿Por qué hay que igualar los denominadores?',
       'Porque solo se pueden sumar partes del mismo tamaño.\n\n'
       + '1. Un cuarto y un medio son pedazos distintos.\n'
       + '2. Al igualar el denominador, los pedazos quedan iguales.\n'
       + '3. Entonces ya se pueden sumar.\n\n'
       + '¿Qué pasaría si sumaras 1/2 más 1/4 sin igualarlos?']
    );

    await cliente.query('COMMIT');

    console.log('Datos de ejemplo cargados.\n');
    console.log('  Establecimiento : Instituto Nacional de Educación Básica');
    console.log('  Cursos          : 4 (uno sin estudiantes, para ver ese estado)');
    console.log('  Materiales      : 5 (uno retirado)');
    console.log('  Transcripción   : 5 subtítulos, uno corregido por la docente');
    console.log('\nCuentas para probar:\n');
    console.log(`  Administrador   admin@umg.edu.gt      ${CONTRASENAS.administrador}`);
    console.log(`  Docente         ana@umg.edu.gt        ${CONTRASENAS.docente}`);
    console.log(`  Docente         luis@umg.edu.gt       ${CONTRASENAS.docente}`);
    console.log(`  Estudiante      pedro@umg.edu.gt      ${CONTRASENAS.estudiante}`);
    console.log(`  Estudiante      sofia@umg.edu.gt      ${CONTRASENAS.estudiante}`);
    console.log(`  Desactivada     elena@umg.edu.gt      ${CONTRASENAS.estudiante}`);
    console.log('\nSon credenciales de desarrollo. No las use en un despliegue real.');
    console.log(`  (administrador id ${admin})`);
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

main()
  .catch((error) => {
    console.error('No se pudieron cargar los datos de ejemplo:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
