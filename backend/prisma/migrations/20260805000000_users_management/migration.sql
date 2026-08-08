-- Usuarios: baja lógica auditable. Nunca se pierde una identidad por eliminarla.
ALTER TABLE seguridad.usuarios
  ADD COLUMN IF NOT EXISTS eliminado_en TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS eliminado_por UUID;

CREATE INDEX IF NOT EXISTS usuarios_fid_organizaciones_eliminado_en_created_at_idx
  ON seguridad.usuarios (fid_organizaciones, eliminado_en, created_at DESC);

-- Un correo activo solo puede pertenecer a una persona activa de la misma empresa.
-- La restricción parcial protege también carreras de concurrencia entre dos altas.
CREATE UNIQUE INDEX IF NOT EXISTS personas_correos_organizacion_correo_activo_key
  ON personas.personas_correos (fid_organizaciones, lower(correo))
  WHERE estado = 1;
