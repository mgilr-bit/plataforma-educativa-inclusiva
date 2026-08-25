# Registro de cambios

Todas las entregas relevantes del proyecto se documentan aquí, de la más reciente a la más antigua.

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
