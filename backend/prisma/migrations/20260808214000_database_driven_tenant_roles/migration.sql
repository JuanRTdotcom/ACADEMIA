ALTER TABLE seguridad.roles
  ADD COLUMN IF NOT EXISTS asignable_por_empresa boolean NOT NULL DEFAULT true;

-- La clasificación se conserva en datos; el código de ejecución solo consulta
-- esta capacidad y no conoce alias especiales.
UPDATE seguridad.roles
SET asignable_por_empresa = false
WHERE codigo = 'SUPERADMIN';
