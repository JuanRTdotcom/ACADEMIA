DROP INDEX IF EXISTS nucleo.organizaciones_es_sistema_estado_idx;

ALTER TABLE nucleo.organizaciones
  DROP COLUMN es_sistema;
