# Lista de tareas — Seguimiento del desarrollo

Marcar cada tarea al completarla e indicar la fecha y el PR o commit asociado.
Formato: `- [x] Tarea — YYYY-MM-DD — PR #N`

Cada tarea tiene su Issue correspondiente en GitHub, etiquetado por fase (`fase-0` a `fase-5`).

## Fase 0 — Configuración del proyecto
- [x] Crear repositorio en GitHub y primer push — 2026-08-24 — Issue #6
- [x] Configurar ramas `main` y `develop` — 2026-08-24 — Issue #7
- [x] Crear tablero de Proyecto (Kanban) en GitHub — 2026-08-25 — Issue #8
- [x] Definir Issues iniciales por fase — 2026-08-25 — Issue #9
- [x] Configurar Antigravity con Claude Code — 2026-08-25 — Issue #10

## Fase 1 — Base de datos
- [ ] Revisar y ajustar el diagrama ER final
- [x] Ejecutar DDL inicial en PostgreSQL (local) — 2026-08-24
- [x] Crear migraciones versionadas — 2026-08-24
- [x] Cargar datos semilla de prueba — 2026-08-24
- [x] Desplegar instancia PostgreSQL en Railway — 2026-09-05 — Issue #14

## Fase 2 — Backend (Node.js / Express)
- [x] Inicializar proyecto y estructura de carpetas — 2026-08-24
- [x] Conexión a PostgreSQL — 2026-08-24
- [x] Autenticación y roles (estudiante, docente, administrador) — 2026-08-25
- [x] CRUD de usuarios — 2026-08-25 — Issue #18
- [x] CRUD de contenidos educativos — 2026-08-25 — Issue #19
- [x] CRUD de cursos e inscripciones — 2026-08-25 — Issue #46
- [x] Endpoint de transcripción con Whisper API — 2026-09-05 — Issue #20
- [x] Endpoint de asistente educativo con Claude API — 2026-09-05 — Issue #21
- [x] Manejo de errores y validaciones — 2026-09-05 — Issue #22
- [x] Limitar intentos de inicio de sesión — 2026-09-05 — Issue #53
- [x] Pruebas unitarias básicas — 2026-09-05 — Issue #23
- [x] Despliegue en Railway — 2026-09-05 — Issue #24

## Fase 3 — Frontend (React)
- [x] Inicializar proyecto React — 2026-09-05 — Issue #25
- [x] Implementar wireframes: pantalla de inicio de sesión — 2026-09-05 — Issue #26
- [ ] Implementar panel del estudiante
- [ ] Implementar panel del docente
- [ ] Componente de transcripción en tiempo real (subtítulos)
- [ ] Componente de chat con asistente educativo
- [ ] Accesibilidad: alto contraste, tamaños de fuente, navegación por teclado
- [ ] Consumo de la API del backend
- [ ] Despliegue en Vercel

## Fase 4 — Integración y pruebas
- [ ] Pruebas de integración frontend–backend
- [ ] Pruebas de accesibilidad (WCAG)
- [ ] Pruebas con usuarios (docentes y estudiantes)
- [ ] Corrección de hallazgos

## Fase 5 — Documentación y cierre
- [ ] Manual técnico
- [ ] Manual de usuario
- [ ] Evidencia fotográfica y capturas en `docs/`
- [ ] Actualizar capítulos de la tesis con resultados
