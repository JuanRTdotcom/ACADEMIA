ALTER TABLE configuracion.planes
  ADD COLUMN almacenamiento_max_bytes bigint;

ALTER TABLE configuracion.planes
  ADD CONSTRAINT planes_almacenamiento_max_bytes_check
  CHECK (almacenamiento_max_bytes IS NULL OR almacenamiento_max_bytes > 0);

CREATE TABLE nucleo.archivos_organizacion (
  id_archivos_organizacion uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  clave_objeto varchar(1024) NOT NULL UNIQUE,
  tipo_mime varchar(120) NOT NULL,
  bytes bigint NOT NULL,
  estado integer NOT NULL DEFAULT 2,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por text,
  CONSTRAINT archivos_organizacion_organizacion_fk FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT archivos_organizacion_bytes_check CHECK (bytes > 0),
  CONSTRAINT archivos_organizacion_estado_check CHECK (estado IN (0, 1, 2))
);

CREATE INDEX archivos_organizacion_organizacion_estado_idx
  ON nucleo.archivos_organizacion(fid_organizaciones, estado);

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON nucleo.archivos_organizacion
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO nucleo.archivos_organizacion (
  fid_organizaciones, clave_objeto, tipo_mime, bytes, estado, created_at,
  created_by, updated_by
)
SELECT fid_organizaciones, clave_objeto, tipo_mime, bytes, 1, created_at,
       'migration', 'migration'
FROM personas.adjuntos_registro_atencion
WHERE eliminado_en IS NULL AND estado = 1
ON CONFLICT (clave_objeto) DO NOTHING;
