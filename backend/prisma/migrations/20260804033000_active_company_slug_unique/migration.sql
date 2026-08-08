-- Un slug inactivo o eliminado no bloquea el aprovisionamiento de otra empresa.
DROP INDEX IF EXISTS nucleo.organizaciones_slug_key;

CREATE UNIQUE INDEX organizaciones_slug_activo_uidx
ON nucleo.organizaciones (slug)
WHERE estado = 1;
