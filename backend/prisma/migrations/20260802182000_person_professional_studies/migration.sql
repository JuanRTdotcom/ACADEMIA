CREATE TABLE personas.personas_documentos (
  id_personas_documentos UUID PRIMARY KEY DEFAULT gen_random_uuid(), fid_personas UUID NOT NULL,
  codigo_tipo_documento VARCHAR(80) NOT NULL, numero_documento VARCHAR(40) NOT NULL,
  estado INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT, updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by TEXT,
  CONSTRAINT personas_documentos_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE,
  CONSTRAINT personas_documentos_unicos UNIQUE (fid_personas, codigo_tipo_documento, numero_documento)
);
CREATE INDEX personas_documentos_persona_estado_idx ON personas.personas_documentos(fid_personas, estado);

CREATE TABLE personas.personas_nacionalidades (
  id_personas_nacionalidades UUID PRIMARY KEY DEFAULT gen_random_uuid(), fid_personas UUID NOT NULL,
  fid_admin_level_0 UUID NOT NULL, estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by TEXT,
  CONSTRAINT personas_nacionalidades_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE,
  CONSTRAINT personas_nacionalidades_pais_fkey FOREIGN KEY (fid_admin_level_0) REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT,
  CONSTRAINT personas_nacionalidades_unicas UNIQUE (fid_personas, fid_admin_level_0)
);
CREATE INDEX personas_nacionalidades_persona_estado_idx ON personas.personas_nacionalidades(fid_personas, estado);

CREATE TABLE personas.personas_seguros (
  id_personas_seguros UUID PRIMARY KEY DEFAULT gen_random_uuid(), fid_personas UUID NOT NULL,
  compania VARCHAR(120) NOT NULL, numero_seguro VARCHAR(80) NOT NULL, estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by TEXT,
  CONSTRAINT personas_seguros_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE
);
CREATE INDEX personas_seguros_persona_estado_idx ON personas.personas_seguros(fid_personas, estado);

CREATE TABLE personas.personas_telefonos (
  id_personas_telefonos UUID PRIMARY KEY DEFAULT gen_random_uuid(), fid_personas UUID NOT NULL,
  codigo_tipo_telefono VARCHAR(80) NOT NULL, numero VARCHAR(30) NOT NULL, titular VARCHAR(120) NOT NULL,
  es_emergencia BOOLEAN NOT NULL DEFAULT FALSE, estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by TEXT,
  CONSTRAINT personas_telefonos_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE,
  CONSTRAINT personas_telefonos_numero_unico UNIQUE (fid_personas, numero)
);
CREATE INDEX personas_telefonos_persona_estado_idx ON personas.personas_telefonos(fid_personas, estado);

CREATE TABLE personas.personas_hobbies (
  id_personas_hobbies UUID PRIMARY KEY DEFAULT gen_random_uuid(), fid_personas UUID NOT NULL,
  hobby VARCHAR(100) NOT NULL, codigo_frecuencia VARCHAR(80) NOT NULL, estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by TEXT,
  CONSTRAINT personas_hobbies_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE,
  CONSTRAINT personas_hobbies_unicos UNIQUE (fid_personas, hobby)
);
CREATE INDEX personas_hobbies_persona_estado_idx ON personas.personas_hobbies(fid_personas, estado);

CREATE TABLE personas.personas_estudios_realizados (
  id_personas_estudios_realizados UUID PRIMARY KEY DEFAULT gen_random_uuid(), fid_personas UUID NOT NULL,
  fecha_inicio DATE NOT NULL, fecha_fin DATE, en_curso BOOLEAN NOT NULL DEFAULT FALSE,
  codigo_nivel_instruccion VARCHAR(80) NOT NULL, grado_obtenido VARCHAR(120), profesion VARCHAR(120),
  estado INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT, updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by TEXT,
  CONSTRAINT personas_estudios_realizados_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE,
  CONSTRAINT personas_estudios_realizados_fechas_check CHECK ((en_curso AND fecha_fin IS NULL) OR (NOT en_curso AND fecha_fin IS NOT NULL AND fecha_fin >= fecha_inicio))
);
CREATE INDEX personas_estudios_realizados_persona_estado_idx ON personas.personas_estudios_realizados(fid_personas, estado);

CREATE TABLE personas.personas_estudios_complementarios (
  id_personas_estudios_complementarios UUID PRIMARY KEY DEFAULT gen_random_uuid(), fid_personas UUID NOT NULL,
  codigo_tipo_estudio VARCHAR(80) NOT NULL, institucion VARCHAR(150) NOT NULL,
  fecha_inicio DATE NOT NULL, fecha_fin DATE, en_curso BOOLEAN NOT NULL DEFAULT FALSE,
  estado INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT, updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by TEXT,
  CONSTRAINT personas_estudios_complementarios_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE,
  CONSTRAINT personas_estudios_complementarios_fechas_check CHECK ((en_curso AND fecha_fin IS NULL) OR (NOT en_curso AND fecha_fin IS NOT NULL AND fecha_fin >= fecha_inicio))
);
CREATE INDEX personas_estudios_complementarios_persona_estado_idx ON personas.personas_estudios_complementarios(fid_personas, estado);

-- Conserva documento y teléfonos existentes antes de retirar columnas únicas.
INSERT INTO personas.personas_documentos (fid_personas, codigo_tipo_documento, numero_documento, created_by, updated_by)
SELECT id_personas, codigo_tipo_documento, numero_documento, created_by, updated_by
FROM personas.personas WHERE codigo_tipo_documento IS NOT NULL AND numero_documento IS NOT NULL;
INSERT INTO personas.personas_telefonos (fid_personas, codigo_tipo_telefono, numero, titular, es_emergencia, created_by, updated_by)
SELECT id_personas, 'movil', telefono_principal, CONCAT_WS(' ', nombres, apellido_paterno), FALSE, created_by, updated_by
FROM personas.personas WHERE telefono_principal IS NOT NULL;
INSERT INTO personas.personas_telefonos (fid_personas, codigo_tipo_telefono, numero, titular, es_emergencia, created_by, updated_by)
SELECT id_personas, 'otro', telefono_emergencia, CONCAT_WS(' ', nombres, apellido_paterno), TRUE, created_by, updated_by
FROM personas.personas WHERE telefono_emergencia IS NOT NULL
ON CONFLICT (fid_personas, numero) DO UPDATE SET es_emergencia = TRUE;

ALTER TABLE personas.personas
  DROP COLUMN codigo_tipo_documento,
  DROP COLUMN numero_documento,
  DROP COLUMN telefono_principal,
  DROP COLUMN telefono_emergencia;

INSERT INTO configuracion.parametros (id_parametros, codigo_grupo, codigo, etiqueta, orden)
VALUES
  (gen_random_uuid(), 'tipos_telefono', 'movil', 'Móvil', 10),
  (gen_random_uuid(), 'tipos_telefono', 'fijo', 'Fijo', 20),
  (gen_random_uuid(), 'tipos_telefono', 'trabajo', 'Trabajo', 30),
  (gen_random_uuid(), 'tipos_telefono', 'otro', 'Otro', 40),
  (gen_random_uuid(), 'frecuencias_hobby', 'diaria', 'Diaria', 10),
  (gen_random_uuid(), 'frecuencias_hobby', 'semanal', 'Semanal', 20),
  (gen_random_uuid(), 'frecuencias_hobby', 'quincenal', 'Quincenal', 30),
  (gen_random_uuid(), 'frecuencias_hobby', 'mensual', 'Mensual', 40),
  (gen_random_uuid(), 'frecuencias_hobby', 'ocasional', 'Ocasional', 50),
  (gen_random_uuid(), 'tipos_estudio_complementario', 'curso', 'Curso', 10),
  (gen_random_uuid(), 'tipos_estudio_complementario', 'taller', 'Taller', 20),
  (gen_random_uuid(), 'tipos_estudio_complementario', 'seminario', 'Seminario', 30),
  (gen_random_uuid(), 'tipos_estudio_complementario', 'diplomado', 'Diplomado', 40),
  (gen_random_uuid(), 'tipos_estudio_complementario', 'certificacion', 'Certificación', 50),
  (gen_random_uuid(), 'tipos_estudio_complementario', 'congreso', 'Congreso', 60)
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET etiqueta = EXCLUDED.etiqueta, orden = EXCLUDED.orden, estado = 1;
