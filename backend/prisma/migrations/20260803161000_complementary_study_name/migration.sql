ALTER TABLE personas.personas_estudios_complementarios
  ADD COLUMN nombre_estudio VARCHAR(150);

UPDATE personas.personas_estudios_complementarios
SET nombre_estudio = CASE
  WHEN codigo_tipo_estudio = 'otro' AND tipo_estudio_otro IS NOT NULL
    THEN tipo_estudio_otro
  ELSE initcap(replace(codigo_tipo_estudio, '_', ' '))
END;

ALTER TABLE personas.personas_estudios_complementarios
  ALTER COLUMN nombre_estudio SET NOT NULL,
  ADD CONSTRAINT estudios_complementarios_nombre_valido CHECK (
    char_length(btrim(nombre_estudio)) BETWEEN 2 AND 150
  );

DROP INDEX IF EXISTS personas.estudios_complementarios_activo_uidx;
CREATE UNIQUE INDEX estudios_complementarios_activo_uidx
ON personas.personas_estudios_complementarios(
  fid_personas,
  codigo_tipo_estudio,
  lower(nombre_estudio),
  lower(institucion),
  fecha_inicio
)
WHERE estado = 1;
