-- Datos iniciales: roles del sistema
INSERT INTO rol (nombre_rol, descripcion) VALUES
  ('administrador', 'Gestiona usuarios, establecimientos y configuración'),
  ('docente',       'Carga contenido, revisa transcripciones y crea evaluaciones'),
  ('estudiante',    'Consume contenido, usa el tutor y responde evaluaciones')
ON CONFLICT (nombre_rol) DO NOTHING;
