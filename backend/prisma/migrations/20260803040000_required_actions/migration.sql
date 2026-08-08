CREATE TABLE configuracion.acciones_requeridas_maestro (
  id_acciones_requeridas_maestro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(120) NOT NULL,
  seccion VARCHAR(60) NOT NULL,
  nombre VARCHAR(160) NOT NULL,
  descripcion TEXT,
  prioridad INTEGER NOT NULL DEFAULT 1,
  icono VARCHAR(60),
  estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  CONSTRAINT acciones_requeridas_maestro_codigo_key UNIQUE (codigo),
  CONSTRAINT acciones_requeridas_maestro_prioridad_valida
    CHECK (prioridad BETWEEN 1 AND 3),
  CONSTRAINT acciones_requeridas_maestro_estado_valido
    CHECK (estado IN (0, 1))
);

CREATE INDEX acciones_requeridas_maestro_seccion_estado_idx
ON configuracion.acciones_requeridas_maestro (seccion, estado);

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON configuracion.acciones_requeridas_maestro
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

CREATE TABLE seguridad.acciones_requeridas (
  id_acciones_requeridas UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones UUID NOT NULL,
  fid_usuarios UUID NOT NULL,
  fid_acciones_requeridas_maestro UUID NOT NULL,
  clave_recurso VARCHAR(120) NOT NULL,
  metadatos JSONB,
  resuelta_en TIMESTAMPTZ(3),
  estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  CONSTRAINT acciones_requeridas_usuario_maestro_recurso_key
    UNIQUE (fid_usuarios, fid_acciones_requeridas_maestro, clave_recurso),
  CONSTRAINT acciones_requeridas_organizacion_fk
    FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones)
    ON DELETE CASCADE,
  CONSTRAINT acciones_requeridas_usuario_fk
    FOREIGN KEY (fid_usuarios)
    REFERENCES seguridad.usuarios(id_usuarios)
    ON DELETE CASCADE,
  CONSTRAINT acciones_requeridas_maestro_fk
    FOREIGN KEY (fid_acciones_requeridas_maestro)
    REFERENCES configuracion.acciones_requeridas_maestro(id_acciones_requeridas_maestro)
    ON DELETE RESTRICT,
  CONSTRAINT acciones_requeridas_estado_valido CHECK (estado IN (0, 1)),
  CONSTRAINT acciones_requeridas_resolucion_coherente CHECK (
    (estado = 1 AND resuelta_en IS NULL)
    OR (estado = 0 AND resuelta_en IS NOT NULL)
  )
);

CREATE INDEX acciones_requeridas_organizacion_usuario_estado_idx
ON seguridad.acciones_requeridas (fid_organizaciones, fid_usuarios, estado);

CREATE INDEX acciones_requeridas_maestro_estado_idx
ON seguridad.acciones_requeridas (fid_acciones_requeridas_maestro, estado);

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON seguridad.acciones_requeridas
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();
