-- La sede principal tiene un código estable y reservado dentro de cada organización.
UPDATE nucleo.sedes
SET codigo = 'SEDE-' || upper(substr(replace(id_sedes::text, '-', ''), 1, 8)),
    updated_at = CURRENT_TIMESTAMP
WHERE es_principal = false
  AND upper(codigo) = 'PRINCIPAL';

UPDATE nucleo.sedes
SET codigo = 'PRINCIPAL',
    updated_at = CURRENT_TIMESTAMP
WHERE es_principal = true
  AND codigo <> 'PRINCIPAL';

ALTER TABLE nucleo.sedes
  ADD CONSTRAINT sedes_principal_codigo_check
  CHECK (NOT es_principal OR codigo = 'PRINCIPAL');
