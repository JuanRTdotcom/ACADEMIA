ALTER TABLE nucleo.perfil_organizacion
  ADD COLUMN IF NOT EXISTS sin_sede_fisica BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS nucleo.servicios_veterinaria (
  id_servicios_veterinaria UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones UUID NOT NULL REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  descripcion VARCHAR(500),
  precio DECIMAL(10,2),
  estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  UNIQUE (fid_organizaciones, nombre)
);
CREATE INDEX IF NOT EXISTS servicios_veterinaria_organizacion_estado_idx
  ON nucleo.servicios_veterinaria (fid_organizaciones, estado);
