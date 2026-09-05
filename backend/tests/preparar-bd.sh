#!/bin/sh
# Prepara la base de datos de pruebas desde cero.
# Se ejecuta solo cuando hace falta; `npm test` no la recrea en cada corrida.
set -e

BD=plataforma_educativa_test
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"

dropdb --if-exists "$BD"
createdb "$BD"
psql -q -d "$BD" -f "$RAIZ/database/migrations/001_esquema_inicial.sql"
psql -q -d "$BD" -f "$RAIZ/database/migrations/002_contenido_estado.sql"
psql -q -d "$BD" -f "$RAIZ/database/seeds/001_roles.sql"

echo "Base de datos de pruebas lista: $BD"
