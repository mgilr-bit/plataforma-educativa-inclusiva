# Despliegue

Cómo poner **Aula Todos** en línea: el backend en Railway y el frontend en
Vercel.

> **Qué está comprobado y qué no.** Lo que dice este documento sobre el estado
> actual de Railway se verificó consultando el servicio en funcionamiento
> (fecha de la comprobación: 17 de octubre de 2026). Los pasos de Vercel están
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

## Paso 1 — Variables del backend en Railway

En el servicio del backend, sección *Variables*.

| Variable | Valor | Por qué |
|---|---|---|
| `NODE_ENV` | `production` | Activa los límites de peticiones, que se desactivan en pruebas |
| `DATABASE_URL` | *(la pone Railway)* | Conexión a PostgreSQL |
| `DATABASE_SSL` | `true` | Railway exige TLS. Va aparte de `NODE_ENV` a propósito: en local se usa `production` sin TLS |
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

Sin esto no se puede entrar. Desde la consola de Railway, en el servicio del
backend:

```bash
node scripts/create-admin.js
```

El guion pide nombre, correo y contraseña. **No use las credenciales de
ejemplo**: son públicas, están en el README y en el repositorio.

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
