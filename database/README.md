# Base de datos

Motor: PostgreSQL 14 o superior.

## Aplicar en local

```bash
createdb plataforma_educativa
psql -d plataforma_educativa -f migrations/001_esquema_inicial.sql
psql -d plataforma_educativa -f migrations/002_contenido_estado.sql
psql -d plataforma_educativa -f seeds/001_roles.sql
```

## Convención de migraciones
Archivos numerados y en orden: `NNN_descripcion.sql`. Nunca se edita una migración ya aplicada; los cambios van en una nueva.

## Migraciones aplicadas

| Archivo | Descripción |
|---|---|
| `001_esquema_inicial.sql` | Esquema base: 16 tablas del modelo. |
| `002_contenido_estado.sql` | Columna `estado` en `contenido` para la baja lógica. |
