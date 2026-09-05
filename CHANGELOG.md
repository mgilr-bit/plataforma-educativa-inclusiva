# Registro de cambios

Todas las entregas relevantes del proyecto se documentan aquí, de la más reciente a la más antigua.

## [0.12.0] — 2026-09-05
### Agregado
- Script `scripts/hash-password.js` para restablecer contraseñas en un entorno donde no se puede ejecutar el backend.
- Despliegue en Railway: instancia de PostgreSQL con el esquema y los datos semilla aplicados, y backend publicado con dominio propio.
- `GET /api/health` responde correctamente en producción.

## [0.11.0] — 2026-09-05
### Corregido
- Seis entradas mal formadas devolvían `500`: JSON inválido, cuerpo excesivo, un objeto donde se espera texto y tres filtros con parámetros de consulta repetidos.

### Agregado
- Manejador central de errores que traduce los fallos conocidos al código HTTP que corresponde.
- `toText`, que valida que un valor sea realmente texto antes de tratarlo como tal.
- Cierre ordenado ante `SIGTERM` y `SIGINT`, y registro de promesas rechazadas sin manejar.
- Variable `CORS_ORIGINS` para restringir los orígenes admitidos en producción.
- 14 pruebas de manejo de errores.

### Cambiado
- El cuerpo JSON queda limitado a 100 KB.

## [0.10.0] — 2026-09-05
### Agregado
- Suite de 58 pruebas con el ejecutor propio de Node, sin dependencias de framework.
- Base de datos de pruebas separada (`plataforma_educativa_test`) y script `npm run test:preparar`.
- Pruebas de integración del control de acceso por rol y pruebas unitarias de validaciones, middleware y servicios de IA.

### Cambiado
- La aplicación Express se separa en `src/app.js`; `src/server.js` solo la pone a escuchar, para poder montarla en pruebas sin abrir un puerto.

## [0.9.0] — 2026-09-05
### Agregado
- Asistente educativo con la Claude API: `POST /api/tutor/ask`.
- La transcripción de la clase se adjunta como contexto y se marca para caché, de modo que varias preguntas sobre el mismo contenido reutilizan el prefijo.
- Continuidad de conversación con los últimos intercambios sobre el mismo contenido.
- Historial de consultas en `GET /api/tutor/consultations`, con alcance por rol.
- Variables `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `TUTOR_MODEL` y `TUTOR_EFFORT` en `backend/.env.example`.

## [0.8.0] — 2026-09-05
### Agregado
- Transcripción de audio con la Whisper API: `POST /api/contents/:id/transcription`.
- Los segmentos devueltos por Whisper se guardan como subtítulos con sus marcas de tiempo.
- Revisión docente de la transcripción y corrección de subtítulos individuales.
- Variables `OPENAI_API_KEY`, `OPENAI_BASE_URL` y `WHISPER_MODEL` en `backend/.env.example`.

### Corregido
- Se actualiza `qs` para resolver una vulnerabilidad moderada reportada por `npm audit`.

## [0.7.0] — 2026-08-25
### Agregado
- CRUD de cursos en `/api/courses`, con filtros por docente, grado y ciclo escolar, y conteo de inscritos y contenidos.
- Gestión de inscripciones: alta, baja y listado de estudiantes por curso.
- Validación de roles al asignar docentes e inscribir estudiantes.

## [0.6.0] — 2026-08-25
### Agregado
- CRUD de contenidos educativos en `/api/contents`, con paginación, filtros por curso y tipo, y búsqueda por título.
- Visibilidad por rol: el docente ve los cursos que imparte y el estudiante solo aquellos en los que está inscrito.
- Migración `002_contenido_estado.sql`: columna `estado` en `contenido` para la baja lógica.

## [0.5.1] — 2026-08-25
### Cambiado
- Se cierra la Fase 0: tablero Kanban en GitHub Projects y entorno de desarrollo configurados.
- Las 37 tareas de `TAREAS.md` quedan registradas como issues etiquetados por fase y sincronizados con el tablero.

## [0.5.0] — 2026-08-25
### Agregado
- CRUD de usuarios en `/api/users` con paginación, filtros por rol y estado, y búsqueda por nombre o correo.
- Baja lógica de usuarios (`estado = false`) para preservar la integridad referencial.
- `src/utils/validators.js` con las validaciones compartidas entre controladores.

### Cambiado
- El alta de usuarios se unifica en `POST /api/users`; se retira `POST /api/auth/register`.

## [0.4.0] — 2026-08-25
### Agregado
- Autenticación con JSON Web Tokens y contraseñas cifradas con bcrypt.
- `POST /api/auth/login`, `POST /api/auth/register` (solo administrador) y `GET /api/auth/me`.
- Middlewares `authenticate` y `authorize` para restringir rutas por rol.
- Script `npm run crear-admin` para dar de alta al primer administrador.
- Variables `JWT_SECRET` y `JWT_EXPIRES_IN` en `backend/.env.example`.

## [0.3.0] — 2026-08-24
### Agregado
- Backend Express inicial con estructura `src/` (config, routes).
- Pool de conexiones a PostgreSQL mediante `DATABASE_URL`.
- Endpoint `GET /api/health` que verifica la conexión y reporta los roles registrados.
- Archivo `backend/.env.example` con las variables requeridas.

## [0.2.0] — 2026-08-24
### Agregado
- Migración inicial `001_esquema_inicial.sql` con las 16 tablas del modelo.
- Datos semilla de roles (`001_roles.sql`): administrador, docente y estudiante.
- `database/README.md` con instrucciones de creación y carga de la base de datos.

## [0.1.0] — 2026-08-24
### Agregado
- Estructura inicial del repositorio.
- README, lista de tareas y contexto para Claude Code.
