-- El correo vigente es único por empresa sin distinguir mayúsculas/minúsculas.
-- El correo de una cuenta eliminada queda inactivo y no bloquea un alta nueva.
DROP INDEX IF EXISTS personas.personas_correos_organizacion_correo_activo_key;

CREATE UNIQUE INDEX personas_correos_organizacion_correo_activo_key
  ON personas.personas_correos (fid_organizaciones, LOWER(correo))
  WHERE estado = 1;
