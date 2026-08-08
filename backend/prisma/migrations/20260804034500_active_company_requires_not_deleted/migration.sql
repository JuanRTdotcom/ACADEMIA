-- Una empresa activa es, por contrato, estado = 1 y sin eliminación lógica.
DROP INDEX IF EXISTS nucleo.organizaciones_slug_activo_uidx;

CREATE UNIQUE INDEX organizaciones_slug_activo_uidx
ON nucleo.organizaciones (slug)
WHERE estado = 1 AND eliminado_en IS NULL;

ALTER TABLE nucleo.organizaciones
ADD CONSTRAINT organizaciones_eliminada_inactiva_check
CHECK (eliminado_en IS NULL OR estado = 0);
