-- =====================================================================
-- Migración 001 — Esquema inicial
-- Plataforma web educativa con IA para estudiantes con discapacidad
-- auditiva, San Juan Sacatepéquez
-- Autor: Milton David Gil Rivera (2026)
-- Motor: PostgreSQL 14+
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. Catálogos y organización
-- ---------------------------------------------------------------
CREATE TABLE rol (
    id_rol        SERIAL PRIMARY KEY,
    nombre_rol    VARCHAR(30)  NOT NULL UNIQUE,
    descripcion   VARCHAR(150)
);

CREATE TABLE establecimiento (
    id_establecimiento SERIAL PRIMARY KEY,
    nombre             VARCHAR(150) NOT NULL,
    direccion          VARCHAR(200),
    aldea_zona         VARCHAR(100),
    telefono           VARCHAR(15)
);

-- ---------------------------------------------------------------
-- 2. Usuarios
-- ---------------------------------------------------------------
CREATE TABLE usuario (
    id_usuario         SERIAL PRIMARY KEY,
    nombre_completo    VARCHAR(120) NOT NULL,
    correo             VARCHAR(120) NOT NULL UNIQUE,
    contrasena_hash    VARCHAR(255) NOT NULL,
    id_rol             INT NOT NULL REFERENCES rol(id_rol),
    id_establecimiento INT REFERENCES establecimiento(id_establecimiento),
    estado             BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 3. Cursos e inscripciones
-- ---------------------------------------------------------------
CREATE TABLE curso (
    id_curso      SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    grado         VARCHAR(30)  NOT NULL,
    ciclo_escolar INT          NOT NULL,
    id_docente    INT NOT NULL REFERENCES usuario(id_usuario)
);

CREATE TABLE inscripcion (
    id_inscripcion    SERIAL PRIMARY KEY,
    id_estudiante     INT NOT NULL REFERENCES usuario(id_usuario),
    id_curso          INT NOT NULL REFERENCES curso(id_curso),
    fecha_inscripcion DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (id_estudiante, id_curso)
);

-- ---------------------------------------------------------------
-- 4. Contenido educativo y procesamiento con IA
-- ---------------------------------------------------------------
CREATE TABLE contenido (
    id_contenido SERIAL PRIMARY KEY,
    id_curso     INT NOT NULL REFERENCES curso(id_curso),
    titulo       VARCHAR(150) NOT NULL,
    tipo         VARCHAR(20)  NOT NULL CHECK (tipo IN ('video','audio','documento','texto')),
    url_archivo  VARCHAR(255),
    duracion_seg INT,
    fecha_carga  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE transcripcion (
    id_transcripcion   SERIAL PRIMARY KEY,
    id_contenido       INT NOT NULL UNIQUE REFERENCES contenido(id_contenido) ON DELETE CASCADE,
    texto_completo     TEXT NOT NULL,
    precision_estimada DECIMAL(5,2),
    estado_revision    VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                       CHECK (estado_revision IN ('pendiente','revisada','aprobada')),
    fecha_generacion   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE subtitulo (
    id_subtitulo     SERIAL PRIMARY KEY,
    id_transcripcion INT NOT NULL REFERENCES transcripcion(id_transcripcion) ON DELETE CASCADE,
    segmento_texto   VARCHAR(500) NOT NULL,
    tiempo_inicio    DECIMAL(10,3) NOT NULL,
    tiempo_fin       DECIMAL(10,3) NOT NULL,
    editado_docente  BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (tiempo_fin >= tiempo_inicio)
);

CREATE TABLE resumen (
    id_resumen           SERIAL PRIMARY KEY,
    id_contenido         INT NOT NULL REFERENCES contenido(id_contenido) ON DELETE CASCADE,
    texto_resumen        TEXT NOT NULL,
    nivel_simplificacion VARCHAR(20) NOT NULL DEFAULT 'medio'
                         CHECK (nivel_simplificacion IN ('basico','medio','avanzado')),
    fecha_generacion     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE consulta_tutor (
    id_consulta    SERIAL PRIMARY KEY,
    id_estudiante  INT NOT NULL REFERENCES usuario(id_usuario),
    id_contenido   INT REFERENCES contenido(id_contenido) ON DELETE SET NULL,
    pregunta       TEXT NOT NULL,
    respuesta      TEXT,
    fecha_consulta TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 5. Evaluaciones
-- ---------------------------------------------------------------
CREATE TABLE evaluacion (
    id_evaluacion  SERIAL PRIMARY KEY,
    id_contenido   INT NOT NULL REFERENCES contenido(id_contenido) ON DELETE CASCADE,
    titulo         VARCHAR(150) NOT NULL,
    tipo           VARCHAR(20) NOT NULL DEFAULT 'cuestionario',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE pregunta (
    id_pregunta    SERIAL PRIMARY KEY,
    id_evaluacion  INT NOT NULL REFERENCES evaluacion(id_evaluacion) ON DELETE CASCADE,
    enunciado      TEXT NOT NULL,
    tipo_respuesta VARCHAR(20) NOT NULL CHECK (tipo_respuesta IN ('opcion_multiple','verdadero_falso','abierta')),
    opciones       JSONB
);

CREATE TABLE respuesta_estudiante (
    id_respuesta    SERIAL PRIMARY KEY,
    id_pregunta     INT NOT NULL REFERENCES pregunta(id_pregunta) ON DELETE CASCADE,
    id_estudiante   INT NOT NULL REFERENCES usuario(id_usuario),
    respuesta       TEXT,
    es_correcta     BOOLEAN,
    fecha_respuesta TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 6. Seguimiento, notificaciones y auditoría
-- ---------------------------------------------------------------
CREATE TABLE progreso (
    id_progreso       SERIAL PRIMARY KEY,
    id_estudiante     INT NOT NULL REFERENCES usuario(id_usuario),
    id_contenido      INT NOT NULL REFERENCES contenido(id_contenido) ON DELETE CASCADE,
    porcentaje_avance DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (porcentaje_avance BETWEEN 0 AND 100),
    ultima_visita     TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (id_estudiante, id_contenido)
);

CREATE TABLE notificacion (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario      INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    mensaje         VARCHAR(255) NOT NULL,
    tipo            VARCHAR(30) NOT NULL DEFAULT 'informativa',
    leida           BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_envio     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE bitacora (
    id_bitacora  SERIAL PRIMARY KEY,
    id_usuario   INT REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    accion       VARCHAR(50) NOT NULL,
    detalle      VARCHAR(255),
    fecha_accion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- 7. Índices de consulta frecuente
-- ---------------------------------------------------------------
CREATE INDEX idx_usuario_rol            ON usuario(id_rol);
CREATE INDEX idx_curso_docente          ON curso(id_docente);
CREATE INDEX idx_contenido_curso        ON contenido(id_curso);
CREATE INDEX idx_subtitulo_transcripcion ON subtitulo(id_transcripcion, tiempo_inicio);
CREATE INDEX idx_consulta_estudiante    ON consulta_tutor(id_estudiante);
CREATE INDEX idx_progreso_estudiante    ON progreso(id_estudiante);
CREATE INDEX idx_notificacion_usuario   ON notificacion(id_usuario, leida);
CREATE INDEX idx_bitacora_usuario_fecha ON bitacora(id_usuario, fecha_accion);

COMMIT;
