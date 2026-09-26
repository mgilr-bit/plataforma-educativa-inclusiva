#!/bin/sh
# Levanta el backend y el frontend con un solo comando.
#
# Existe porque son dos servidores en puertos distintos, y olvidarse de uno
# produce un error de conexion que parece un fallo de la aplicacion.
set -e

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
BD=plataforma_educativa

# PostgreSQL primero: sin base, el backend arranca pero todo falla despues,
# con un error que no dice que el problema es este.
if ! pg_isready -q 2>/dev/null; then
  echo "PostgreSQL no responde."
  echo "Inicielo con:  brew services start postgresql@16"
  exit 1
fi

if ! psql -lqt 2>/dev/null | cut -d '|' -f 1 | grep -qw "$BD"; then
  echo "No existe la base de datos '$BD'."
  echo "Creela con:  createdb $BD  y aplique las migraciones de database/"
  exit 1
fi

if [ ! -f "$RAIZ/backend/.env" ]; then
  echo "Falta backend/.env."
  echo "Copielo con:  cp backend/.env.example backend/.env"
  exit 1
fi

# Al cortar con Ctrl+C se detienen ambos: dejar uno vivo ocuparia el puerto y
# el siguiente arranque fallaria sin explicar por que.
detener() {
  echo ""
  echo "Deteniendo los servidores..."
  kill $PID_BACKEND $PID_FRONTEND 2>/dev/null || true
  exit 0
}
trap detener INT TERM

echo "Iniciando el backend en http://localhost:4000 ..."
(cd "$RAIZ/backend" && npm run dev) &
PID_BACKEND=$!

echo "Iniciando el frontend en http://localhost:5173 ..."
(cd "$RAIZ/frontend" && npm run dev) &
PID_FRONTEND=$!

echo ""
echo "Listo. Abra http://localhost:5173 y pulse Ctrl+C aqui para detener ambos."
echo ""

wait
