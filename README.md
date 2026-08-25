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
