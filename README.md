# Plataforma Educativa Inclusiva con IA

Plataforma web de apoyo educativo para estudiantes con discapacidad auditiva en San Juan Sacatepéquez, Guatemala.

**Proyecto de graduación** — Ingeniería en Sistemas de Información y Ciencias de la Computación
Universidad Mariano Gálvez de Guatemala, Sede San Juan Sacatepéquez
Autor: Milton — Carné 3590-09-66

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React.js |
| Backend | Node.js / Express |
| Base de datos | PostgreSQL |
| Transcripción de voz | Whisper API |
| Asistente educativo | Claude API |
| Despliegue | Vercel (frontend) / Railway (backend + BD) |

## Estructura del repositorio

```
frontend/    Aplicación React
backend/     API REST en Express
database/    DDL, migraciones y datos semilla
docs/        Evidencia de avances, capturas y bitácora
TAREAS.md    Lista de tareas por fase (seguimiento)
CHANGELOG.md Registro de cambios por entrega
CLAUDE.md    Contexto del proyecto para Claude Code
```

## Flujo de trabajo

- `main`: versión estable.
- `develop`: integración de trabajo diario.
- `feature/<nombre>`: una rama por funcionalidad, integrada mediante Pull Request.
- Convención de commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
- Cada tarea se registra como Issue y se referencia en el commit (`Closes #N`).

## Instalación local

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

Las variables de entorno se documentan en `backend/.env.example` y `frontend/.env.example`.

## Primer administrador

El alta de usuarios está reservada al rol `administrador`, por lo que el primero se crea desde la línea de comandos:

```bash
cd backend
npm run crear-admin -- "Nombre Completo" correo@dominio.com "contrasena"
```

A partir de ahí, ese administrador puede registrar docentes y estudiantes mediante `POST /api/auth/register`.

## Endpoints disponibles

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/health` | Público |
| POST | `/api/auth/login` | Público |
| GET | `/api/auth/me` | Autenticado |
| GET | `/api/users` | Administrador |
| POST | `/api/users` | Administrador |
| GET | `/api/users/:id` | Administrador o el propio usuario |
| PATCH | `/api/users/:id` | Administrador o el propio usuario |
| DELETE | `/api/users/:id` | Administrador (baja lógica) |
| GET | `/api/contents` | Autenticado (filtrado por rol) |
| GET | `/api/contents/:id` | Autenticado (filtrado por rol) |
| POST | `/api/contents` | Administrador o docente titular |
| PATCH | `/api/contents/:id` | Administrador o docente titular |
| DELETE | `/api/contents/:id` | Administrador o docente titular (baja lógica) |
| GET | `/api/courses` | Autenticado (filtrado por rol) |
| GET | `/api/courses/:id` | Autenticado (filtrado por rol) |
| POST | `/api/courses` | Administrador |
| PATCH | `/api/courses/:id` | Administrador o docente titular |
| GET | `/api/courses/:id/enrollments` | Administrador o docente titular |
| POST | `/api/courses/:id/enrollments` | Administrador o docente titular |
| DELETE | `/api/courses/:id/enrollments/:idEstudiante` | Administrador o docente titular |
| POST | `/api/contents/:id/transcription` | Administrador o docente titular |
| GET | `/api/contents/:id/transcription` | Autenticado (filtrado por rol) |
| PATCH | `/api/transcriptions/:id` | Administrador o docente titular |
| PATCH | `/api/subtitles/:id` | Administrador o docente titular |

El listado admite paginación y filtros: `?pagina=1&limite=20&rol=docente&estado=true&buscar=texto`.

La baja de usuarios es **lógica** (`estado = false`), no física: siete tablas referencian a `usuario`, y un borrado real rompería cursos, inscripciones y progreso.

### Visibilidad de los contenidos

| Rol | Qué ve |
|---|---|
| Administrador | Todos los contenidos. |
| Docente | Los de los cursos que imparte, activos y retirados. |
| Estudiante | Los contenidos activos de los cursos en los que está inscrito. |

### Visibilidad de los cursos

| Rol | Qué ve |
|---|---|
| Administrador | Todos los cursos. |
| Docente | Los cursos que imparte. |
| Estudiante | Los cursos en los que está inscrito. |

Solo el administrador crea cursos y reasigna su docente titular. Las inscripciones las gestionan el administrador y el docente titular del curso.

## Transcripción de voz a texto

El docente sube el audio de un contenido y la API lo envía a la Whisper API de OpenAI, que devuelve el texto y sus segmentos con marcas de tiempo. El texto se guarda en `transcripcion` y los segmentos en `subtitulo`, que alimentan los subtítulos del reproductor.

```bash
curl -X POST http://localhost:4000/api/contents/1/transcription \
  -H "Authorization: Bearer <TOKEN>" \
  -F "audio=@clase.mp3"
```

- Formatos admitidos: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, flac. Máximo 25 MB.
- Cada contenido admite una sola transcripción.
- El docente puede corregir cada subtítulo (`PATCH /api/subtitles/:id`), que queda marcado como `editado_docente`, y avanzar el estado de revisión a `revisada` o `aprobada`. **La revisión humana importa**: los subtítulos automáticos contienen errores, y son el canal principal de acceso al contenido para los estudiantes con discapacidad auditiva.
- Sin `OPENAI_API_KEY` configurada, el endpoint responde `503` y el resto de la API sigue operando con normalidad.
