UPDATE seguridad.roles
SET descripcion = CASE codigo
  WHEN 'SUPERADMIN' THEN 'Administra la configuración global de la plataforma.'
  WHEN 'ADMIN' THEN 'Administra la configuración de su organización.'
  ELSE 'Rol configurado para la plataforma.'
END
WHERE descripcion IS NULL OR char_length(btrim(descripcion)) < 5;

ALTER TABLE seguridad.roles
  ALTER COLUMN descripcion TYPE VARCHAR(250),
  ALTER COLUMN descripcion SET NOT NULL;

ALTER TABLE seguridad.roles
  ADD CONSTRAINT roles_descripcion_longitud_check
    CHECK (char_length(btrim(descripcion)) BETWEEN 5 AND 250);

ALTER TABLE seguridad.roles
  DROP CONSTRAINT IF EXISTS roles_fid_organizaciones_codigo_key;

DROP INDEX IF EXISTS seguridad.roles_fid_organizaciones_codigo_key;

CREATE UNIQUE INDEX roles_org_codigo_vigente_uidx
ON seguridad.roles (fid_organizaciones, codigo)
WHERE eliminado_en IS NULL;
