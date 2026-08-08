ALTER TABLE personas.personas
  ALTER COLUMN discapacidad DROP DEFAULT;

ALTER TABLE personas.personas
  ALTER COLUMN discapacidad TYPE BOOLEAN
  USING CASE
    WHEN discapacidad IS NULL OR LOWER(TRIM(discapacidad)) IN ('', 'no', 'false', '0', 'ninguna', 'ninguno') THEN FALSE
    ELSE TRUE
  END;

ALTER TABLE personas.personas
  ALTER COLUMN discapacidad SET DEFAULT FALSE,
  ALTER COLUMN discapacidad SET NOT NULL;
