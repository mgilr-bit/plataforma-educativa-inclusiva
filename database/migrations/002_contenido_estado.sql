-- Migración 002: baja lógica de contenidos
--
-- La tabla contenido es referenciada por transcripcion, resumen, progreso y
-- evaluacion con ON DELETE CASCADE. Un borrado físico destruiría el progreso
-- académico de los estudiantes, por lo que se agrega una marca de estado para
-- retirar contenidos sin perder el historial.

ALTER TABLE contenido
    ADD COLUMN estado BOOLEAN NOT NULL DEFAULT TRUE;

-- El listado filtra casi siempre por contenidos activos de un curso.
CREATE INDEX idx_contenido_curso_estado ON contenido (id_curso, estado);
