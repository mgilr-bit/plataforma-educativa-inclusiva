# Registro de cambios

Todas las entregas relevantes del proyecto se documentan aquí, de la más reciente a la más antigua.

## [0.38.0] — 2026-10-10
### Cambiado
- La pantalla de una clase pasa a dos columnas: el video a un lado y el material escrito al otro, con pestañas para Resumen, Transcripción y Tutor. Antes iba todo apilado, y en una clase de trece minutos la transcripción quedaba a una pantalla de distancia del video que describe.
- El video se queda fijo mientras se lee la transcripción. Es la razón de ser de las dos columnas: que el texto y lo que describe estén a la vista a la vez. Se prefirió fijar el video antes que recortar el panel con su propio desplazamiento, porque un área desplazable dentro de otra es incómoda con el dedo y la plataforma se usará en tableta.
- Cabecera oscura, con los contrastes medidos: 13.65:1 el texto principal y 7.25:1 el secundario, ambos por encima del nivel AAA. En alto contraste pasa a negra con borde blanco.
- `SubtitlePlayer` se divide en `MediaPlayer` y `TranscriptList`, que comparten estado por el hook `useReproductor`: en la pantalla ocupan columnas distintas y necesitan lo mismo —por qué segundo va la reproducción y cómo saltar a un momento—.
- Los controles del video siguen siendo los del navegador. Unos propios se ven más a medida, pero hay que rehacer a mano el teclado, el foco y los nombres accesibles, y es la causa más común de reproductores inaccesibles.

### Corregido
- Las tres pestañas en una fila no cabían en 320 px y forzaban desplazamiento horizontal, que el criterio de reflujo (WCAG 1.4.10) no admite. Ahora envuelven, que es preferible a desplazarlas: así ninguna queda fuera de la vista.
- Sin transcripción, la pantalla abre directamente la pestaña de la transcripción, donde está el botón de generarla. Abrir el resumen dejaba lo único accionable escondido detrás de una pestaña que había que descubrir.

## [0.37.0] — 2026-10-09
### Cambiado
- La plataforma se llama **Aula Todos**, con el lema «Clases accesibles para estudiantes con menor capacidad auditiva». Antes se presentaba como «Plataforma Educativa Inclusiva», que describía la categoría pero no nombraba nada. El nombre aparece en la cabecera, el inicio de sesión, el título de cada pestaña y el README.
- En pantallas de menos de 75 rem el lema se retira de la cabecera y deja el sitio a la navegación; sigue completo en el inicio de sesión y en el título de la pestaña.
- No se renombran el repositorio, las carpetas ni el paquete: cambiarlos rompería la dirección de GitHub, los despliegues y los enlaces de la documentación sin que se vea nada distinto.

## [0.36.0] — 2026-10-09
### Cambiado
- Tipografía propia: Lexend, diseñada para mejorar la fluidez de lectura con formas simplificadas y más aire entre letras. No es una elección estética: muchos estudiantes sordos señantes leen el español como segunda lengua y por debajo de su grado. Se sirve desde el propio proyecto y no desde Google Fonts, porque la conexión en San Juan Sacatepéquez no siempre acompaña y porque pedirla a un tercero enviaría la dirección IP de cada estudiante —menores de edad— a un servicio ajeno al establecimiento. Es variable: 73 KB para todos los pesos.
- El marco de la aplicación y la medida de lectura dejan de ser lo mismo. Antes todo estaba encerrado en 70 caracteres, incluida la rejilla de cursos y las tablas, lo que dejaba la aplicación en una tira estrecha con medio monitor vacío al lado. Ahora el marco es ancho y la medida de 70 caracteres se aplica solo al texto que se lee seguido; las pantallas de lectura centran su columna.
- Cabecera con superficie propia, símbolo de marca y la sesión a la derecha. La marca aparece también en el inicio de sesión, que es la única pantalla sin cabecera.
- El estado de revisión de una transcripción pasa a ser una etiqueta con color y borde propios; como texto gris menudo bajo el título, nadie lo leía.

### Corregido
- El `<header>` estaba dentro de `<main>`: el punto de referencia «banner» quedaba anidado dentro del contenido. No se había detectado porque las pruebas auditan componentes sueltos y no la aplicación montada.
- El enlace «Saltar al contenido» asomaba por arriba de la pantalla. Se escondía con un desplazamiento fijo de 3 rem, pero el enlace crece con la escala de texto y en «Muy grande» quedaba a la vista. Ahora se esconde con `translateY(-100%)`, que es su propia altura sea cual sea.
- Los controles de accesibilidad no estaban dentro de ningún punto de referencia; ahora son una `<section>` con nombre.
- Los botones de la transcripción incumplían «etiqueta en el nombre» (WCAG 2.5.3): el nombre accesible decía «Ir al minuto 0:00: Buenas tardes…» y en pantalla se leía «0:00 Buenas tardes…», de modo que el texto visible no estaba contenido en el nombre y quien maneja la plataforma por voz no acertaba el botón.
- El botón de borrar una consulta al asistente tenía el mismo defecto: el nombre decía «Borrar la pregunta: …» y en pantalla se leía «Borrar esta pregunta». Apareció al auditar una clase que ya tenía consultas; las páginas sin ninguna no lo mostraban.

## [0.35.2] — 2026-10-09
### Corregido
- No se podía reproducir ningún archivo subido. El reproductor usaba la ruta guardada tal cual, pero lo que se guarda es relativo al servidor de la API (`/archivos/...`), no a la página: en desarrollo son dos puertos distintos y en producción serán dos dominios distintos. El navegador pedía el archivo al servidor de la página, recibía el `index.html` de la aplicación y mostraba «No se pudo reproducir el archivo». El único material que funcionaba era el que apunta a una dirección completa de otro sitio.
- Ninguna prueba lo detectaba porque todos los fixtures del reproductor usaban direcciones absolutas, que no es lo que produce una subida real.

## [0.35.1] — 2026-10-03
### Corregido
- Las pruebas de integración fallaban una de cada tres o cuatro ejecuciones, cambiando de archivo cada vez. `supertest` levantaba y cerraba un servidor efímero en cada petición, y con decenas seguidas eso falla a veces con `ECONNRESET`; cuando el que se caía era un inicio de sesión, el token quedaba vacío y todas las pruebas de ese archivo respondían 401. Ahora cada archivo levanta un solo servidor y lo cierra al terminar. Verificado con 12 ejecuciones seguidas sin un fallo.

## [0.35.0] — 2026-10-03
### Agregado
- Resumen de la clase en lenguaje sencillo, generado con Claude a partir de la transcripción. La transcripción literal no es accesibilidad por sí sola: es un docente hablando a 165 palabras por minuto, y para un estudiante sordo señante el español escrito es una segunda lengua. El asistente ya sabía explicar así, pero solo si el estudiante preguntaba.
- El resumen trae tres partes: de qué trata, lo importante, y las palabras nuevas con su significado. Definir el vocabulario es la mitad del trabajo: sin eso el resumen es corto pero igual de ilegible.
- Tres niveles, con diferencias medibles y no decorativas. Medido sobre la misma clase: el básico salió con 6.3 palabras por oración y el avanzado con 11.9.
- El estudiante elige con cuál leer. El resumen va arriba de la transcripción, porque para quien lee con esfuerzo el texto completo es justo la barrera.
- El docente puede corregirlo y borrarlo para generarlo de nuevo. La máquina también se equivoca, y vale lo mismo que con la transcripción: si nadie puede arreglarlo, el error llega al estudiante tal cual.
- Se pinta con encabezados, listas y una lista de definiciones de verdad, para que un lector de pantalla salte de sección en sección y el glosario se anuncie como lo que es.
- Se activa la tabla `resumen`, que estaba en el modelo desde el principio sin una sola línea de código que la tocara.

### Cambiado
- La construcción del cliente de Claude y la traducción de sus errores pasan a `claudeClient.js`, compartidas por el tutor y los resúmenes, para que no se vayan apartando con el tiempo.

## [0.34.0] — 2026-10-03
### Agregado
- El docente puede corregir el título y el tipo de un material, y retirarlo. Los endpoints existían desde la fase 2, pero el cliente del frontend no tenía los métodos y no había ningún botón: un material subido por equivocación obligaba a crear otro y dejar el anterior rondando.
- Retirar es baja lógica: el estudiante deja de verlo, el docente lo sigue viendo y puede volver a publicarlo. La transcripción y el progreso se conservan, porque dependen del material con `ON DELETE CASCADE` y un borrado físico se llevaría por delante lo que el estudiante ya estudió.
- El archivo se puede sustituir mientras el material no tenga transcripción, y el anterior se borra del disco. Con transcripción se niega y se explica: el texto hablaría de un audio que ya no suena, y el estudiante sordo no tiene cómo notarlo.
- La confirmación del retiro se pregunta dentro de la página y nombra el material. El aviso del navegador no se puede redactar en lenguaje sencillo ni se lleva bien con los lectores de pantalla.

### Corregido
- `buscarConDueno` no traía `url_archivo`, de modo que al sustituir un archivo el anterior se quedaba en el disco. El encadenamiento opcional se tragaba el `undefined` sin error.
- `PATCH /api/contents/:id` admite el estado como texto además de como booleano: en una petición multipart todos los campos llegan como texto, y antes la validación los rechazaba.

## [0.33.0] — 2026-10-03
### Agregado
- El docente puede corregir la transcripción. Los endpoints existían desde la fase 2, pero el cliente del frontend no tenía ni los métodos: `estado_revision` se quedaba en «pendiente» para siempre y el estudiante leía «Sin revisar por el docente» sin que eso pudiera cambiar nunca.
- La corrección va junto a la clase y no en otra pantalla, para que el docente corrija mientras escucha lo que la máquina entendió.
- Cada campo y cada botón dicen a qué fragmento pertenecen. El momento se ve como «1:05» y se anuncia como «el minuto 1 con 5 segundos», porque un lector de pantalla lee «1:05» como «uno dos puntos cero cinco».

### Corregido
- Corregir un subtítulo ya rehace el texto completo de la transcripción. El estudiante lee los segmentos y el asistente lee el texto completo: eran dos copias del mismo contenido, así que el docente podía arreglar los subtítulos y el asistente seguía respondiendo con lo que Whisper oyó mal, sin que nadie se enterara.
- Un fragmento no puede quedar vacío: sería un hueco mudo en los subtítulos, y para quien no oye eso es contenido perdido sin aviso de que falta.

## [0.32.0] — 2026-10-03
### Corregido
- Las clases largas no se podían transcribir. La plataforma admite 200 MB y la API de transcripción acepta 25, y nada comprobaba el tamaño: el docente subía la clase, esperaba y recibía un error del servidor. No se había notado porque los audios de ejemplo pesan 0.2 MB por minuto; una grabación real de teléfono pesa unos 5 MB por minuto en video.

### Agregado
- Antes de transcribir, el servidor extrae solo la voz y la comprime a un canal y 32 kbps. Son unos 14 MB por hora, de modo que una clase de 45 minutos entra de sobra. El video se descarta entero, que es de donde venía casi todo el peso. Una prueba real: 36 MB quedaron en 0.9 MB en 2.4 segundos.
- Las grabaciones que aún así no caben se parten en trozos, y cada uno lleva el desplazamiento que sitúa sus tiempos dentro de la clase completa. Sin eso, los subtítulos del segundo trozo empezarían otra vez en cero.
- El tamaño se comprueba sobre el trozo ya extraído en lugar de confiar en el cálculo: el bitrate real no es el nominal y cada trozo carga su propia cabecera, así que la cuenta se queda corta. Un trozo un kilobyte por encima lo rechaza la API igual que uno de 40 MB.
- `ffmpeg-static` como dependencia: trae el binario en el propio paquete, así que el despliegue en Railway no necesita configuración de build ni paquetes del sistema.

## [0.31.0] — 2026-10-03
### Agregado
- Botón «Generar transcripción» en la pantalla del material. El endpoint existía desde la fase 2, pero ningún punto de la interfaz lo llamaba: el docente subía la clase y ahí se quedaba. Sin transcripción no hay texto, no hay subtítulos y el asistente no tiene de qué agarrarse, de modo que para un estudiante sordo ese material no servía de nada. Se detectó porque tres audios llevaban semanas subidos con cero transcripciones.
- El botón se ofrece solo a quien puede usarlo: el docente titular del curso y el administrador, y solo cuando el material es audio o video con el archivo guardado en la plataforma. Para un enlace de otro sitio el servidor no puede leer el archivo, así que ofrecerlo terminaría siempre en error.
- Al estudiante se le sigue explicando la espera; al docente titular no, porque hablarle de «cuando el docente la genere» es hablarle de sí mismo en tercera persona.
- Al terminar, el foco pasa a la transcripción. El botón que se pulsó desaparece, y sin ese traslado quien navega con teclado vuelve al principio del documento.

## [0.30.0] — 2026-09-26
### Agregado
- El chat con el asistente avisa al estudiante que su docente puede ver las preguntas, y para qué le sirven. Se guardaban desde el principio, pero nadie se lo decía: quien lo descubre después deja de preguntar con confianza, y ahí se pierde el propósito de la herramienta.
- `DELETE /api/tutor/consultations/:id` y el botón correspondiente en el chat: el estudiante puede borrar cualquier pregunta suya. Solo puede borrar quien preguntó —ni el docente ni el administrador—, y el borrado es físico: si fuera una marca, el docente seguiría viéndola mientras el estudiante cree que la eliminó.
- El nombre accesible del botón lleva la pregunta que borra («Borrar la pregunta: ¿Qué es una fracción?»), porque con lector de pantalla varios botones «Borrar» seguidos son indistinguibles.

## [0.29.0] — 2026-09-26
### Corregido
- El docente no podía inscribir estudiantes: la pantalla llenaba el desplegable con el listado general de usuarios, al que no tiene acceso, así que quedaba vacío y deshabilitado sin explicar por qué.

### Agregado
- `GET /api/courses/:id/available-students`: los estudiantes activos que aún no están inscritos en ese curso, accesible para su docente titular. Se resuelve así en lugar de abrir el listado general: el docente necesita elegir a quién inscribir en su curso, no conocer el padrón del establecimiento.
- El control de accesibilidad pasa a ser un control segmentado, con tamaño propio independiente de la escala que él mismo gobierna, y anclado al desplazarse.

## [0.28.1] — 2026-09-26
### Corregido
- El informe de uso del asistente omitía los tokens escritos en caché, de modo que una consulta con la transcripción completa aparecía como si hubiera consumido 2 tokens de entrada.

## [0.28.0] — 2026-09-15
### Corregido
- Los errores del servicio de transcripción se traducían a «respondió 429», que no le dice nada a un docente. Ahora se distingue la falta de saldo del exceso de peticiones y de una clave inválida, porque lo que hay que hacer es distinto en cada caso.

## [0.27.0] — 2026-09-15
### Agregado
- El docente puede subir el archivo de la clase —audio, video o documento, hasta 200 MB— y la plataforma lo guarda y lo sirve al estudiante.
- La transcripción se genera a partir del archivo ya guardado, sin volver a subirlo.
- `npm run generar-clases`: genera clases de ejemplo en audio real con voz en español, para probar el recorrido completo sin grabar nada.
- Variable `UPLOADS_DIR` para apuntar a un volumen persistente en el despliegue.

### Corregido
- Un archivo subido quedaba huérfano en disco si el alta del material fallaba después de guardarlo.
- La transcripción desde el archivo guardado fallaba con `500`: sin cuerpo en la petición, `req.body` queda indefinido.

## [0.26.0] — 2026-09-15
### Agregado
- Informe de conformidad con WCAG 2.1 en `docs/accesibilidad/`, con el estado de cada criterio, su evidencia y las limitaciones declaradas de la revisión.
- Cada pantalla fija su propio título de documento.
- 9 pruebas de criterios concretos: títulos por pantalla, recorrido de teclado, ausencia de trampas de foco y escalado del texto.

### Corregido
- Todas las pantallas compartían el mismo título del documento, lo que incumplía el criterio 2.4.2. Quien tuviera varias pestañas abiertas no podía distinguirlas.

## [0.25.0] — 2026-09-15
### Agregado
- Pruebas de integración que recorren la plataforma de extremo a extremo —el administrador monta el curso, la docente publica material, el estudiante lo consume— y verifican que cada respuesta traiga los campos exactos que leen las pantallas.
- Comprobación del contrato de errores: toda respuesta de error trae `estado` y `mensaje`, y las de validación además el detalle por campo.

## [0.24.0] — 2026-09-08
### Cambiado
- Jerarquía visual de todas las pantallas: rejilla de tarjetas que se adapta al ancho, escala de elevación, ritmo de espaciado y peso tipográfico diferenciado por nivel de encabezado.
- El inicio de sesión se presenta como tarjeta centrada, y la cabecera separa marca, navegación y usuario.
- Estados vacíos y de error con icono, y filas de tabla resaltadas al pasar el puntero.

### Agregado
- Conjunto propio de iconos SVG en línea, que heredan el color del texto y funcionan en ambos temas sin ajustes.
- Transiciones de 180 ms en color, borde y sombra.

### Notas
- No se modificó ningún color: los contrastes medidos contra WCAG siguen siendo los mismos.
- Las sombras se anulan en el tema de alto contraste, donde la profundidad se transmite con el borde.

## [0.23.0] — 2026-09-08
### Agregado
- `npm run datos-demo`: escenario de ejemplo con establecimiento, docentes, estudiantes, cursos, materiales y una transcripción con subtítulos. Se niega a ejecutarse si la base no es local, porque borra todo lo que haya.
- `sh scripts/dev.sh`: levanta backend y frontend con un solo comando, comprobando antes PostgreSQL, la base y el `.env`.

## [0.22.0] — 2026-09-08
### Agregado
- Gestión de usuarios: listado en tabla con búsqueda y filtros, alta de cuentas, baja y reactivación. Visible solo para el administrador.
- Alta de cursos con asignación del docente titular.
- Inscripción y baja de estudiantes desde la pantalla del curso.
- 10 pruebas de la gestión de usuarios, y auditoría de accesibilidad sobre esa pantalla.

### Corregido
- Las rutas no comprobaban el rol: un estudiante que escribiera `/usuarios` veía la pantalla de administración. La API rechazaba las peticiones, de modo que no se filtraron datos, pero la interfaz mostraba una sección que no le corresponde.
- Los nombres accesibles de los botones salían con las palabras pegadas: el cálculo recorta el texto de cada nodo por separado, así que «Desactivar» y « la cuenta de…» se unían en «Desactivarla cuenta de…». Se declaran ahora completos con `aria-label`.
- Dos controles compartían la etiqueta «Rol» en la misma pantalla, indistinguibles para quien no la ve.

## [0.21.0] — 2026-09-08
### Agregado
- Manejo de sesión vencida: un `401` en una petición autenticada descarta el token y lleva al inicio de sesión, explicando por qué.
- Tras volver a entrar, el usuario regresa a la pantalla donde estaba.
- 5 pruebas del vencimiento de sesión.

### Corregido
- Se distingue quedarse sin sesión de no haberla tenido nunca: a quien entra por primera vez ya no se le dice que su sesión terminó.
- Un `401` al iniciar sesión ya no cierra la sesión existente: escribir mal la contraseña no debe expulsar a quien ya estaba dentro.

## [0.20.0] — 2026-09-08
### Agregado
- Auditoría automática de accesibilidad con axe-core sobre todas las pantallas, integrada en la suite de pruebas.
- El foco pasa al contenido principal al cambiar de pantalla, para que el lector de pantalla anuncie la pantalla nueva.

### Cambiado
- El selector de tamaño de letra usa radios nativos en lugar de botones con `role="radio"`: el grupo entero pasa a ser una sola parada del tabulador y se recorre con las flechas.

### Corregido
- `role="log"` estaba puesto sobre la lista de la conversación, lo que anulaba su semántica de lista. Ahora va en el contenedor, conservando ambas cosas.

## [0.19.0] — 2026-09-08
### Agregado
- Chat con el asistente educativo dentro de la pantalla del material, con el historial de preguntas de esa clase.
- La conversación se anuncia con `role="log"` y `aria-live="polite"`, de modo que el estudiante se entera de la respuesta sin que se le interrumpa mientras escribe.
- 8 pruebas del chat.

### Corregido
- El foco no volvía al campo tras enviar una pregunta, porque se pedía mientras el campo seguía deshabilitado. Quien navega con teclado tenía que recorrer toda la conversación para preguntar de nuevo.

## [0.18.0] — 2026-09-05
### Agregado
- Reproductor con subtítulos: los segmentos se entregan como pista WebVTT nativa, de modo que el navegador los dibuja respetando los ajustes de subtítulos del sistema operativo.
- Transcripción completa siempre visible junto al material, con el fragmento en curso resaltado y navegable: al pulsarlo, el reproductor salta a ese momento.
- Pantalla de material con su estado de revisión.
- 16 pruebas del generador WebVTT y del reproductor.

### Corregido
- Vitest solo ejecutaba los archivos `.test.jsx`, de modo que una prueba en `.test.js` no se habría ejecutado nunca sin avisar.

## [0.17.0] — 2026-09-05
### Agregado
- Panel del docente con sus cursos, inscritos y materiales publicados.
- Alta de material desde la pantalla del curso, con confirmación del nombre creado.
- Lista de estudiantes inscritos, visible solo para el docente titular y el administrador.
- El panel se elige según el rol sobre una misma ruta, `/panel`.
- 11 pruebas del panel del docente y del alta de material.

### Cambiado
- Los estilos compartidos de formulario se extraen a `global.css`, en lugar de reutilizar las clases de la pantalla de inicio de sesión.

### Corregido
- El selector de panel se caía si el usuario aún no había cargado, con el mismo modo de fallo ya corregido en la cabecera.

## [0.16.0] — 2026-09-05
### Agregado
- Panel del estudiante con sus cursos, y pantalla de materiales de un curso.
- Estructura común de las pantallas con sesión: cabecera, navegación con la página activa marcada y cierre de sesión.
- Estados de carga, error y listado vacío anunciados con `aria-live`, con opción de reintentar.
- 6 pruebas del panel del estudiante.

### Corregido
- La cabecera se caía si el usuario aún no había cargado, dejando la pantalla en blanco.

## [0.15.0] — 2026-09-05
### Agregado
- Pantalla de inicio de sesión con validación en el cliente y mensajes en lenguaje sencillo.
- Contexto de sesión que restaura al usuario al recargar la página y descarta el token si dejó de ser válido.
- Componente de campo de formulario accesible: etiqueta asociada, error enlazado con `aria-describedby` y `aria-invalid`.
- Rutas protegidas, que esperan a validar el token antes de decidir a dónde llevar al usuario.
- 13 pruebas del frontend con Vitest, que consultan por rol y por etiqueta.
- Prueba de humo que monta la aplicación completa: detecta errores de ejecución que no aparecen al construir.

### Corregido
- El servidor de desarrollo escuchaba solo en IPv6, de modo que un navegador que resolviera `localhost` como IPv4 recibía conexión rechazada. Ahora escucha en todas las interfaces, lo que además permite probar la interfaz desde una tableta en la misma red.

## [0.14.0] — 2026-09-05
### Agregado
- Proyecto de frontend con React 19 y Vite, con enrutado y estructura de carpetas.
- Sistema de tokens de diseño con contrastes medidos contra WCAG 2.1, y tema de alto contraste que supera el nivel AAA.
- Controles de accesibilidad siempre visibles: alto contraste y tres tamaños de letra, que persisten entre visitas.
- Base de accesibilidad: enlace para saltar al contenido, foco visible, área táctil mínima y respeto a `prefers-reduced-motion`.
- Cliente de la API con manejo de token y de errores centralizado.

## [0.13.1] — 2026-09-05
### Corregido
- La aplicación identificaba a todos los clientes por la dirección del proxy, de modo que agotar el límite de intentos desde una conexión bloqueaba a las demás. El número de proxies de confianza pasa a configurarse con `TRUST_PROXY_HOPS`, que en Railway vale `2`.

### Agregado
- `GET /api/health/red`, que informa qué dirección detecta la aplicación y la cadena recibida, para medir el número de saltos en lugar de deducirlo.
- Tres pruebas que fijan la lectura de `TRUST_PROXY_HOPS`.

## [0.13.0] — 2026-09-05
### Agregado
- Límite de intentos en `/api/auth/login`: 10 fallidos cada 15 minutos por dirección IP, sin consumir cuota los inicios correctos.
- Límite general de 300 peticiones por ventana en el resto de la API.
- Variable `DATABASE_SSL` para decidir si la conexión a la base usa TLS.

### Cambiado
- El TLS de la base deja de deducirse de `NODE_ENV`. Esa deducción impedía poner `NODE_ENV=production` en Railway, porque la conexión interna no ofrece TLS.
- La aplicación declara `trust proxy = 1`, necesario para que el límite de peticiones distinga las direcciones reales detrás del proxy.

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
