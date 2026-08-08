ALTER TABLE seguridad.roles
  ALTER COLUMN codigo TYPE VARCHAR(40),
  ALTER COLUMN nombre TYPE VARCHAR(80);

ALTER TABLE seguridad.roles
  ADD CONSTRAINT roles_codigo_formato_check
    CHECK (codigo ~ '^[A-Z][A-Z0-9_]{1,39}$'),
  ADD CONSTRAINT roles_nombre_longitud_check
    CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 80);
