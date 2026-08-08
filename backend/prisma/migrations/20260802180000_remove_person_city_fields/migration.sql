-- La división administrativa Level 3 reemplaza ciudad en procedencia y residencia.
ALTER TABLE personas.personas
  DROP COLUMN ciudad,
  DROP COLUMN ciudad_nacimiento;
