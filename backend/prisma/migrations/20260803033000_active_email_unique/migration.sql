ALTER TABLE personas.personas_correos
DROP CONSTRAINT IF EXISTS personas_correos_organizacion_correo_key;

CREATE UNIQUE INDEX personas_correos_organizacion_correo_activo_key
ON personas.personas_correos (fid_organizaciones, correo)
WHERE estado = 1;
