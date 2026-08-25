# Lista de tareas — Seguimiento del desarrollo

Marcar cada tarea al completarla e indicar la fecha y el PR o commit asociado.
Formato: `- [x] Tarea — YYYY-MM-DD — PR #N`

## Fase 0 — Configuración del proyecto
- [ ] Crear repositorio en GitHub y primer push
- [ ] Configurar ramas `main` y `develop`
- [ ] Crear tablero de Proyecto (Kanban) en GitHub
- [ ] Definir Issues iniciales por fase
- [ ] Configurar Antigravity con Claude Code

## Fase 1 — Base de datos
- [ ] Revisar y ajustar el diagrama ER final
- [x] Ejecutar DDL inicial en PostgreSQL (local) — 2026-08-24
- [x] Crear migraciones versionadas — 2026-08-24
- [x] Cargar datos semilla de prueba — 2026-08-24
- [ ] Desplegar instancia PostgreSQL en Railway

## Fase 2 — Backend (Node.js / Express)
- [x] Inicializar proyecto y estructura de carpetas — 2026-08-24
- [x] Conexión a PostgreSQL — 2026-08-24
- [x] Autenticación y roles (estudiante, docente, administrador) — 2026-08-25
- [ ] CRUD de usuarios
- [ ] CRUD de contenidos educativos
- [ ] Endpoint de transcripción con Whisper API
- [ ] Endpoint de asistente educativo con Claude API
- [ ] Manejo de errores y validaciones
- [ ] Pruebas unitarias básicas
- [ ] Despliegue en Railway

## Fase 3 — Frontend (React)
- [ ] Inicializar proyecto React
- [ ] Implementar wireframes: pantalla de inicio de sesión
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
