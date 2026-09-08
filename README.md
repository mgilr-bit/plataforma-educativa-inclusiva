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
cd backend && npm install && cp .env.example .env

# Frontend
cd frontend && npm install && cp .env.example .env
```

## Arranque

Un solo comando levanta ambos servidores:

```bash
sh scripts/dev.sh
```

Comprueba antes que PostgreSQL responda, que la base exista y que el `.env` esté puesto, y explica qué hacer si falta alguna. `Ctrl+C` detiene los dos: dejar uno vivo ocuparía el puerto y el siguiente arranque fallaría sin decir por qué.

El frontend queda en `http://localhost:5173` y la API en `http://localhost:4000`.

## Datos de ejemplo

```bash
cd backend && npm run datos-demo
```

Deja un escenario coherente: un establecimiento, tres docentes, ocho estudiantes, cuatro cursos —uno sin inscritos, a propósito—, cinco materiales —uno retirado— y una transcripción con cinco subtítulos, uno de ellos corregido por la docente.

**Borra todo lo que haya en la base**, así que se niega a ejecutarse si `DATABASE_URL` no apunta a un servidor local. Comprueba el destino real de la conexión, no el nombre de la variable.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@umg.edu.gt` | `Admin12345` |
| Docente | `ana@umg.edu.gt` | `Docente12345` |
| Docente | `luis@umg.edu.gt` | `Docente12345` |
| Estudiante | `pedro@umg.edu.gt` | `Estudiante12345` |
| Estudiante | `sofia@umg.edu.gt` | `Estudiante12345` |
| Cuenta desactivada | `elena@umg.edu.gt` | `Estudiante12345` |

Son credenciales de desarrollo, escritas en el repositorio a propósito. **Nunca deben usarse en un despliegue real.**

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
| POST | `/api/tutor/ask` | Estudiante |
| GET | `/api/tutor/consultations` | Autenticado (filtrado por rol) |

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

## Asistente educativo

El estudiante pregunta y la API consulta a Claude, que responde con la transcripción de la clase como contexto.

```bash
curl -X POST http://localhost:4000/api/tutor/ask \
  -H "Authorization: Bearer <TOKEN>" -H 'Content-Type: application/json' \
  -d '{"pregunta":"No entendí qué es una fracción","idContenido":1}'
```

- `idContenido` es opcional. Si se envía, el estudiante debe estar inscrito en el curso y el contenido estar activo; su transcripción se adjunta como contexto.
- Se envían los últimos intercambios sobre el mismo contenido, de modo que la conversación tiene continuidad.
- Las instrucciones del asistente están redactadas para el contexto del proyecto: **oraciones cortas, vocabulario simple y sin modismos**, porque para muchos estudiantes sordos el español escrito es una segunda lengua. Además, el asistente no resuelve evaluaciones: guía al estudiante para que llegue solo a la respuesta.
- Solo se guarda la consulta cuando hubo respuesta.
- Sin `ANTHROPIC_API_KEY` configurada, el endpoint responde `503` y el resto de la API sigue operando.

### Alcance del historial

| Rol | Qué consultas ve |
|---|---|
| Administrador | Todas. |
| Docente | Las asociadas a contenidos de los cursos que imparte. |
| Estudiante | Solo las suyas. |

## Pruebas

```bash
cd backend
npm run test:preparar   # una sola vez: crea la base de pruebas y aplica migraciones
npm test
```

Las pruebas corren contra `plataforma_educativa_test`, una base aparte, de modo que **nunca tocan los datos de desarrollo**. Cada archivo vacía las tablas y siembra su propio escenario, así que el orden de ejecución no altera los resultados.

`--test-concurrency=1` es obligatorio: los archivos comparten la base, y en paralelo un `TRUNCATE` borraría los datos que otro está usando.

| Conjunto | Qué cubre |
|---|---|
| `tests/unit/validators.test.js` | Validaciones de correo, contraseña, nombre e identificadores. |
| `tests/unit/auth-middleware.test.js` | Verificación de token: válido, ausente, manipulado, vencido y firmado con otra clave. |
| `tests/unit/whisper-service.test.js` | Cliente de Whisper con `fetch` sustituido; nunca llama al servicio real. |
| `tests/unit/tutor-service.test.js` | Que las instrucciones del asistente conserven los requisitos de accesibilidad. |
| `tests/integration/auth.test.js` | Inicio de sesión, cuentas desactivadas y respuestas uniformes ante credenciales inválidas. |
| `tests/integration/autorizacion.test.js` | Quién ve y modifica qué, por rol. |

`tests/test.env` se versiona a propósito: no contiene secretos. La clave JWT es de usar y tirar y las claves de IA quedan vacías para que las pruebas jamás llamen a servicios externos.

## Manejo de errores

Todas las respuestas de error comparten la misma forma:

```json
{ "estado": "error", "mensaje": "..." }
```

Y las de validación añaden el detalle de cada campo:

```json
{ "estado": "error", "mensaje": "Datos invalidos", "errores": ["..."] }
```

| Código | Cuándo |
|---|---|
| `400` | Datos inválidos, JSON malformado o identificador no numérico. |
| `401` | Falta el token, o está vencido o manipulado. |
| `403` | Autenticado, pero sin permiso sobre ese recurso. |
| `404` | No existe, **o existe y no le corresponde** (no se revela cuál de las dos). |
| `409` | Conflicto: correo repetido, inscripción duplicada, autodesactivación. |
| `413` | El cuerpo excede los 100 KB. |
| `415` | Formato de archivo no admitido. |
| `422` | La petición era válida pero no se pudo cumplir (el asistente declinó). |
| `429` | El servicio de IA está saturado. |
| `502` / `503` / `504` | Un servicio externo falló, no está configurado o tardó demasiado. |
| `500` | Solo fallos reales del servidor. Nunca revela trazas, SQL ni la cadena de conexión. |

En producción, `CORS_ORIGINS` restringe los orígenes admitidos; vacío permite cualquiera y solo es aceptable en local. El servidor cierra de forma ordenada ante `SIGTERM`, que es la señal que envía Railway al redesplegar.

## Despliegue

| Componente | Dónde | Estado |
|---|---|---|
| Base de datos | Railway (PostgreSQL 18) | Esquema y roles aplicados |
| Backend | Railway | https://plataforma-educativa-inclusiva-production.up.railway.app |
| Frontend | Vercel | Pendiente (Fase 3) |

Comprobación rápida:

```bash
curl https://plataforma-educativa-inclusiva-production.up.railway.app/api/health
```

### Restablecer una contraseña en producción

Cuando el usuario ya existe y no se puede ejecutar el backend contra esa base:

```bash
cd backend
node scripts/hash-password.js "correo@dominio.gt" "LaNuevaContrasena"
```

Imprime una sentencia `UPDATE` lista para pegar en la consola de la base. La contraseña nunca sale de la máquina: solo viaja el hash, que el script verifica antes de entregarlo.

### Notas de operación

- **`DATABASE_SSL`** decide si la conexión a la base usa TLS. Antes se deducía de `NODE_ENV`, lo que mezclaba dos cosas independientes: estar en producción y que la base pida cifrado. En Railway la conexión interna va por red privada y no ofrece TLS, así que ahí va en `false`.
- **`/api/auth/login` admite 10 intentos fallidos cada 15 minutos** por dirección IP; los inicios de sesión correctos no consumen cuota. El resto de la API tiene un límite general de 300 peticiones por ventana. Al superarlos se responde `429` con `Retry-After`.
- **`TRUST_PROXY_HOPS` debe valer `2` en Railway** y `1` en local. Determina cuál entrada de `X-Forwarded-For` se toma como dirección del cliente. Con el valor equivocado, la aplicación identifica a todos los clientes por la dirección del proxy y el límite de intentos los trata como uno solo: **un atacante bloquearía a todos los usuarios**.

  El síntoma es traicionero, porque es indistinguible de un límite que funciona: peticiones rechazadas con `429`. Compruébelo con:

  ```bash
  curl https://<dominio>/api/health/red
  ```

  `direccionDetectada` debe ser la dirección pública de quien consulta, no la del proveedor. Verifíquelo tras cualquier cambio de proveedor o al añadir un CDN, porque el número de saltos cambia con la infraestructura y el fallo es silencioso.

- El backend requiere `DATABASE_URL` y `JWT_SECRET`; sin la segunda no arranca, a propósito.
- `DATABASE_URL` se define como referencia (`${{Postgres.DATABASE_URL}}`) y viaja por la red privada de Railway.
- El proxy TCP público de PostgreSQL se habilita solo para aplicar migraciones desde fuera, y **se cierra después**: mientras está activo, la base queda expuesta a internet protegida únicamente por contraseña.
- Alternativa sin abrir el proxy: `railway connect Postgres`.

## Accesibilidad del frontend

No es una capa que se añada al final: está en la base del sistema de estilos.

### Tokens con contraste medido

Todo el color, el tamaño de letra y el espaciado viven en `src/styles/tokens.css`. Los contrastes están **calculados contra WCAG 2.1**, no supuestos:

| Par | Tema normal | Alto contraste |
|---|---|---|
| Texto sobre fondo | 16.91:1 | 21.00:1 |
| Texto suave sobre fondo | 6.59:1 | — |
| Primario sobre fondo | 8.00:1 | 15.18:1 |
| Error sobre fondo | 7.66:1 | 9.20:1 |
| Borde sobre fondo | 4.12:1 | — |

El mínimo AA es 4.5:1 para texto y 3:1 para bordes y controles; el tema de alto contraste supera 7:1, que es AAA.

Como todo deriva de esas variables, **el alto contraste y el escalado de fuente son un cambio de tokens, no de cada componente**.

### Subtítulos

Los segmentos que devuelve la API se convierten a **WebVTT** y se entregan al reproductor como pista nativa, en lugar de dibujarlos por cuenta propia. La razón: así el navegador los renderiza respetando los ajustes de subtítulos que el usuario ya configuró en su sistema operativo —tamaño, color, fondo—, que suelen estar mejor afinados a su necesidad que cualquier valor que eligiéramos nosotros.

Además, **la transcripción completa se muestra siempre**, no solo los subtítulos sobre el video. Un estudiante sordo puede preferir leer el texto entero a su ritmo; sin esa lista, el contenido solo existiría mientras el video avanza. El fragmento en curso se resalta con fondo, barra lateral y negrita —tres señales, no solo color— y con `aria-current` para el lector de pantalla.

### Asistente educativo

El chat vive dentro de la pantalla del material y solo se ofrece al estudiante, porque la API registra cada consulta contra quien pregunta.

Las respuestas se muestran **conservando los saltos de línea**: el asistente explica en pasos numerados, y aplastarlos arruinaría la explicación. Quién habla se indica **con palabras** —«Usted preguntó», «El asistente respondió»—, no solo por la posición o el color, para que un lector de pantalla distinga los turnos.

### Control de acceso en la interfaz

Las rutas restringidas declaran qué roles las pueden ver:

```jsx
<ProtectedRoute roles={['administrador']}>
  <UsersAdmin />
</ProtectedRoute>
```

**Ocultar el enlace en la navegación no es control de acceso**: cualquiera puede escribir la dirección. La API rechaza igualmente las peticiones —ahí está la defensa real—, pero sin esta comprobación el usuario vería una sección que no le corresponde y un formulario que nunca funcionaría.

Cuando el rol no coincide se explica el motivo y se ofrece una salida, en lugar de dejar la pantalla en blanco o redirigir en silencio.

### Criterios de diseño visual

La jerarquía se construye con **espaciado, peso tipográfico y elevación**, nunca con color añadido: los contrastes están medidos y cualquier color nuevo obligaría a rehacer esa verificación.

- **La elevación tiene tres niveles** y se anula en el tema de alto contraste, donde una sombra sobre negro no se distingue: allí la profundidad la da el borde.
- **Las transiciones van en color, borde y sombra, nunca en tamaño.** Un cambio de tamaño al pasar el puntero desplaza los elementos vecinos y hace fallar el clic a quien tiene dificultad motriz.
- **Los iconos son SVG en línea**, no emojis ni una librería externa: heredan el color del texto, así que funcionan en ambos temas sin ajustes, y todos son decorativos —acompañan a un texto que ya dice lo mismo—, por lo que llevan `aria-hidden`.
- **La rejilla de tarjetas se adapta sola** con `auto-fill`, sin puntos de ruptura escritos a mano.
- **Ningún color se escribe fuera de los tokens.** La única excepción es el negro del reproductor, que debe serlo en ambos temas.

### Nombres accesibles

Los botones que se repiten en una lista —«Desactivar», «Dar de baja»— declaran su nombre completo con `aria-label`, no componiéndolo con un sufijo oculto.

La razón se descubrió midiendo: el cálculo del nombre accesible **recorta el texto de cada nodo por separado**, así que `Desactivar` seguido de `<span class="sr-only"> la cuenta de Ana</span>` se anuncia como *«Desactivarla cuenta de Ana»*, con las palabras pegadas. El texto en pantalla se ve correcto; solo el lector de pantalla nota la diferencia.

Por lo mismo, **ningún par de controles comparte etiqueta** en una misma pantalla: dos campos llamados «Rol» son indistinguibles para quien navega sin ver. Hay una prueba que lo comprueba.

### Sesión vencida

El token dura ocho horas. Un estudiante que abre la plataforma por la mañana y vuelve por la tarde se encuentra con un `401`.

Cuando eso ocurre, el cliente descarta el token y avisa al contexto de sesión; las rutas protegidas llevan al inicio de sesión **explicando por qué** y recordando la pantalla de origen, para devolver al usuario donde estaba en vez de al panel genérico.

Se distinguen tres situaciones que parecen la misma:

| Situación | Qué ocurre |
|---|---|
| Sesión vencida estando dentro | Se avisa: «Su sesión terminó por seguridad» |
| Entrar sin haber iniciado sesión | Se lleva al login, sin aviso: no hubo sesión que vencer |
| Contraseña incorrecta | No cierra la sesión existente |

### Auditoría de accesibilidad

La suite incluye una auditoría con **axe-core**, el mismo motor que usan las extensiones de auditoría de los navegadores. Recorre cada pantalla y falla si aparece una violación.

Detecta una parte de los problemas, no todos: lo que depende de juicio humano —si un texto alternativo describe bien una imagen, si el orden de lectura tiene sentido— ninguna herramienta lo ve. La regla de contraste queda desactivada porque jsdom no calcula estilos reales; esos valores se verificaron aparte con la fórmula de WCAG al fijar los tokens.

Lo que la auditoría **no** puede comprobar y se resolvió a mano:

- **El grupo de tamaño de letra usa radios nativos.** Con botones y `role="radio"` el marcado es válido y axe no protesta, pero cada opción sería una parada distinta del tabulador. Los radios nativos hacen del grupo una sola parada, recorrible con flechas.
- **El foco pasa al contenido principal al cambiar de pantalla.** En una aplicación de una sola página el navegador no recarga nada, así que sin esto el lector de pantalla se queda en el enlace pulsado y el estudiante no sabe que cambió de pantalla.

### Pruebas del frontend

```bash
cd frontend && npm test
```

Consultan por **rol y por etiqueta**, no por clase CSS. La diferencia importa: si una prueba encuentra el campo por su etiqueta *"Correo electrónico"*, es porque la asociación está bien hecha, que es exactamente lo que necesita un lector de pantalla. Una prueba que buscara `.form-field__input` pasaría igual con la etiqueta rota.

### Decisiones incorporadas desde el inicio

- **Enlace para saltar al contenido**, primer elemento enfocable de cada página.
- **Indicador de foco visible** con `:focus-visible`, nunca eliminado sin sustituirlo.
- **Área mínima de 44×44 px** en controles, por WCAG 2.5.5: importa en tabletas, que es como se usará en el aula.
- **Interlineado de 1.6 y renglones de 70 caracteres**, que reducen el esfuerzo de lectura en una segunda lengua.
- **`prefers-reduced-motion`** respetado.
- **`lang="es-GT"`** en el documento, para que los lectores de pantalla elijan la voz correcta.
- Los estados activos se marcan **con color y con grosor**, porque el color solo no basta.
