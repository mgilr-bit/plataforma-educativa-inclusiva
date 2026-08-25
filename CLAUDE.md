# Contexto del proyecto para Claude Code

## Qué es este proyecto
Plataforma educativa web con IA para estudiantes con discapacidad auditiva (San Juan Sacatepéquez, Guatemala).
Proyecto de graduación de Ingeniería en Sistemas, UMG. Autor: Milton.

## Stack
- Frontend: React.js (carpeta `frontend/`)
- Backend: Node.js + Express (carpeta `backend/`)
- Base de datos: PostgreSQL (DDL y migraciones en `database/`)
- IA: Whisper API (transcripción de voz a texto), Claude API (asistente educativo)
- Despliegue: Vercel (frontend), Railway (backend y BD)

## Convenciones
- Idioma del código: nombres en inglés; comentarios, commits y documentación en español.
- Commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.
- Cada tarea nace como Issue de GitHub y se referencia en el commit (`Closes #N`).
- Trabajar en ramas `feature/<nombre>` y abrir Pull Request hacia `develop`.
- Al terminar una tarea, actualizar `TAREAS.md` (marcar, fecha, PR) y `CHANGELOG.md`.

## Prioridades de diseño
- Accesibilidad primero: contraste alto, texto legible, navegación por teclado, subtítulos visibles.
- Nunca exponer claves de API en el código; usar variables de entorno.
- Mantener el DDL en `database/` sincronizado con cualquier cambio de modelo.

## Comandos habituales
- Backend: `cd backend && npm run dev`
- Frontend: `cd frontend && npm run dev`
