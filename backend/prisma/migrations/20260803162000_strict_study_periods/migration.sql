-- La regla funcional exige que el fin sea estrictamente posterior al inicio.
-- Normaliza registros históricos del mismo día antes de reforzar la restricción.
UPDATE personas.personas_estudios_realizados
SET fecha_fin = fecha_inicio + 1
WHERE NOT en_curso AND fecha_fin = fecha_inicio;

UPDATE personas.personas_estudios_complementarios
SET fecha_fin = fecha_inicio + 1
WHERE NOT en_curso AND fecha_fin = fecha_inicio;

ALTER TABLE personas.personas_estudios_realizados
  DROP CONSTRAINT estudios_realizados_fechas_validas,
  ADD CONSTRAINT estudios_realizados_fechas_validas CHECK (
    (en_curso AND fecha_fin IS NULL) OR
    (NOT en_curso AND fecha_fin IS NOT NULL AND fecha_fin > fecha_inicio)
  );

ALTER TABLE personas.personas_estudios_complementarios
  DROP CONSTRAINT estudios_complementarios_fechas_validas,
  ADD CONSTRAINT estudios_complementarios_fechas_validas CHECK (
    (en_curso AND fecha_fin IS NULL) OR
    (NOT en_curso AND fecha_fin IS NOT NULL AND fecha_fin > fecha_inicio)
  );
