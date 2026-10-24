# Despliegue

Cómo poner **Aula Todos** en línea: el backend en Railway y el frontend en
Vercel.

> **Qué está comprobado y qué no.** Lo que dice este documento sobre el estado
> actual de Railway se verificó consultando el servicio en funcionamiento
> (fecha de la comprobación: 17 de octubre de 2026; la base y `CORS_ORIGINS`
> se volvieron a comprobar el 23 de octubre). Los pasos de Vercel están
> preparados pero no ejecutados: hacen falta las credenciales de la cuenta.

## Antes de empezar: cuatro cosas que hacen perder una tarde

Son las que se descubren a mitad de la prueba con docentes, cuando ya no hay
margen.

### 1. Sin `VITE_API_URL`, no se reproduce ningún video

El frontend guarda las rutas de los archivos como `/archivos/…`, relativas al
servidor de la API. Si `VITE_API_URL` no apunta a Railway, el navegador las
pide a Vercel, que responde con el `index.html` de la aplicación, y el
reproductor recibe HTML en lugar de video.

Es exactamente el fallo que se corrigió en el issue #95, y en producción se
manifestaría igual.

### 2. Sin volumen persistente, cada redespliegue borra las clases

Railway reinicia el contenedor en cada despliegue y el disco local se pierde.
Sin un volumen montado, **los archivos que subieron los docentes desaparecen**
y solo quedan las filas en la base apuntando a archivos que ya no existen.

### 3. Hoy no hay ninguna cuenta en producción

Comprobado: el esquema está migrado y los tres roles sembrados, pero no existe
ningún usuario. Tras desplegar no se podría entrar. Hay que crear la cuenta de
administrador (paso 4).

### 4. Hoy el backend acepta peticiones de cualquier origen

Comprobado: la API devuelve `Access-Control-Allow-Origin` incluso para dominios
inventados, porque `CORS_ORIGINS` está vacía y en ese caso se permite todo. Hay
que fijarla al dominio de Vercel.

---

## Paso 0 — Llevar el código a `main`

Vercel publica por omisión la rama principal del repositorio, `main`, y es
también la que conviene que publique Railway. Lo que solo está en `develop` no
llega a producción: ni las pantallas nuevas ni `frontend/vercel.json`.

Antes de desplegar, abrir y fusionar el Pull Request de `develop` hacia
`main`. Para confirmar qué rama publica Railway: servicio del backend →
*Settings → Source*.

## Paso 1 — Variables del backend en Railway

En el servicio del backend, sección *Variables*.

| Variable | Valor | Por qué |
|---|---|---|
| `NODE_ENV` | `production` | Cualquier valor salvo `test`: con `test` se apagan los límites de intentos |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Referencia a la base; viaja por la red privada de Railway |
| `DATABASE_SSL` | `false` | La red privada de Railway no ofrece TLS: con `true` el backend no arranca |
| `JWT_SECRET` | *(cadena larga y aleatoria)* | Sin ella el servidor no arranca |
| `JWT_EXPIRES_IN` | `8h` | Una jornada escolar |
| `CORS_ORIGINS` | `https://<su-dominio>.vercel.app` | **Hoy está vacía y se acepta cualquier origen** |
| `TRUST_PROXY_HOPS` | `2` | Ya está puesta y es correcta: medido con `/api/health/red` |
| `UPLOADS_DIR` | `/data/uploads` | Tiene que apuntar al volumen del paso 2 |
| `OPENAI_API_KEY` | *(su clave)* | Transcripción con Whisper |
| `ANTHROPIC_API_KEY` | *(su clave)* | Asistente, resúmenes y sugerencias |

Generar una clave JWT:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Paso 2 — Volumen persistente en Railway

En el servicio del backend: *Settings → Volumes → Add volume*, con punto de
montaje **`/data`**.

Después, `UPLOADS_DIR=/data/uploads`. El servidor crea el subdirectorio solo la
primera vez que alguien sube un archivo.

Sin esto, cada redespliegue borra las clases subidas.

## Paso 3 — Comprobar que el backend quedó bien

```bash
API=https://<su-backend>.up.railway.app/api

# Debe decir "conectada"
curl -s $API/health

# Debe devolver 2 saltos de confianza
curl -s $API/health/red

# Un origen ajeno NO debe recibir cabecera de CORS
curl -s -o /dev/null -D - -X OPTIONS $API/auth/login \
  -H "Origin: https://sitio-ajeno.example" \
  -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
```

La última no debe imprimir nada. Si imprime, `CORS_ORIGINS` no está haciendo
efecto.

## Paso 4 — Crear la cuenta de administrador

Sin esto no se puede entrar. El guion tiene que ejecutarse dentro del
contenedor del backend, porque la base solo es alcanzable por la red privada.
Se entra con la CLI de Railway:

```bash
brew install railway
railway login
railway link          # elegir el proyecto y el servicio del backend
railway ssh           # abre una terminal dentro del contenedor
```

Ya dentro, en la carpeta de la aplicación:

```bash
node scripts/create-admin.js "Nombre Completo" correo@dominio.com "contraseña"
```

Recibe los tres datos como argumentos; no los pregunta. La contraseña debe
tener al menos 8 caracteres. **No use las credenciales de ejemplo**: son
públicas, están en el README y en el repositorio.

La primera vez, `railway ssh` pide registrar una clave SSH local.

## Paso 5 — Frontend en Vercel

1. *New Project* y elegir el repositorio.
2. **Root Directory**: `frontend` ← es lo que más se olvida.
3. Framework: Vite. El comando de compilación y la carpeta de salida los
   detecta solo.
4. Variable de entorno:

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `https://<su-backend>.up.railway.app/api` |

   Con `/api` al final. Es la base sobre la que se resuelven tanto las llamadas
   a la API como las direcciones de los archivos.

5. Desplegar.

El archivo `frontend/vercel.json` ya está en el repositorio y hace dos cosas:

- **Reescribe cualquier ruta al `index.html`.** Sin esto, abrir o recargar
  `/contenidos/12` devuelve 404: el servidor busca un archivo con ese nombre y
  no existe. Comprobado sirviendo la compilación sin la regla — `/login`,
  `/contenidos/12` y `/seguimiento` daban 404.
- **Cachea un año las tipografías y los recursos compilados**, que llevan
  huella en el nombre. Importa en una conexión lenta.

## Paso 6 — Cerrar el círculo

Volver a Railway y poner en `CORS_ORIGINS` el dominio que Vercel acaba de
asignar. Hasta ese momento el navegador bloqueará las llamadas.

Se compara letra por letra con la cabecera `Origin` del navegador: con
`https://` y **sin barra final**. `https://aula-todos.vercel.app` funciona;
`https://aula-todos.vercel.app/` deja la página sin poder hablar con la API.
Varios dominios van separados por comas.

## Paso 7 — Comprobar el recorrido completo

Con la cuenta de administrador:

1. Entrar. *(si falla aquí, revise `VITE_API_URL` y `CORS_ORIGINS`)*
2. Crear un docente y un estudiante, un curso, e inscribir al estudiante.
3. Como docente, **cargar una clase** con audio y esperar el procesamiento.
   *(si la transcripción falla, revise `OPENAI_API_KEY`)*
4. Como estudiante, abrir la clase y **darle a reproducir**.
   *(si dice «no se pudo reproducir», `VITE_API_URL` está mal)*
5. Preguntarle al asistente. *(si falla, revise `ANTHROPIC_API_KEY`)*
6. **Redesplegar el backend y volver a reproducir la clase.**
   *(si ahora falla, el volumen del paso 2 no está montado)*

El paso 6 es el que nadie hace y el que delata el problema más caro.

## Opcional — Dominio propio

Sin hacer nada más, la plataforma ya queda con dos direcciones gratuitas y sin
vencimiento: `*.vercel.app` para la página y `*.up.railway.app` para la API.
El nombre del subdominio de Vercel se puede cambiar en *Settings → Domains* si
está libre.

### Conseguirlo gratis

El [GitHub Student Developer Pack](https://education.github.com/pack), que se
pide con el correo institucional, incluye **un dominio gratis por un año**:
un `.me` en Namecheap, un `.tech`, o una de las extensiones que acepta Name.com.
La renovación del segundo año es de pago, así que conviene elegirlo pensando en
que dure hasta la defensa.

### Apuntarlo

El ejemplo usa `aulatodos.me`; sustitúyalo por el dominio real.

1. **Página**: en Vercel, *Settings → Domains → Add* con `aulatodos.me`.
   Vercel muestra los registros DNS que hay que crear en el panel del
   registrador; se copian tal cual.
2. **API**: en Railway, servicio del backend → *Settings → Networking →
   Custom Domain* con `api.aulatodos.me`. Railway muestra el registro `CNAME`
   que hay que crear.
3. Esperar a que ambos marquen el certificado como emitido. Suele tardar
   minutos, a veces horas.

### Después de apuntarlo

| Dónde | Variable | Valor nuevo |
|---|---|---|
| Railway | `CORS_ORIGINS` | `https://aulatodos.me,https://aula-todos.vercel.app` |
| Vercel | `VITE_API_URL` | `https://api.aulatodos.me/api` |

- **Vercel hay que redesplegarlo** tras cambiar `VITE_API_URL`: el valor se
  graba en la compilación, no se lee al abrir la página.
- **Las clases ya subidas siguen funcionando.** La base guarda las rutas de los
  archivos relativas al servidor de la API, sin el dominio, así que se
  resuelven contra el que diga `VITE_API_URL`.
- **Volver a medir `TRUST_PROXY_HOPS`** con `/api/health/red` en el dominio
  nuevo. Si cambió el número de saltos, el fallo es silencioso: el límite de
  intentos trataría a todos los usuarios como uno solo.

---

## Limitaciones conocidas en producción

Están documentadas porque conviene decirlas antes de que las encuentre alguien
más.

- **La sesión sigue válida hasta ocho horas después de desactivar una cuenta.**
  El token no se consulta contra la base en cada petición. Desactivar impide
  entrar de nuevo, pero no expulsa a quien ya está dentro.
- **Los archivos se sirven sin comprobar la sesión.** Quien tenga la dirección
  completa de un archivo puede abrirlo sin haber iniciado sesión. Las
  direcciones son aleatorias y no se pueden adivinar, pero no son secretas.
- **Las claves de IA se gastan con el uso.** Si se acaba el saldo, la
  plataforma lo dice con un mensaje claro y el resto sigue funcionando: los
  materiales y las transcripciones ya generadas se leen igual.
