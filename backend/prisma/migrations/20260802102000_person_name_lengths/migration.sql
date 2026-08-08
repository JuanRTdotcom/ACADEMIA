DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM personas.personas
    WHERE char_length(nombres) > 50
       OR char_length(apellido_paterno) > 30
       OR char_length(apellido_materno) > 30
  ) THEN
    RAISE EXCEPTION
      'No se pueden limitar los nombres: existen personas con valores mayores a 50/30/30 caracteres';
  END IF;
END
$$;

ALTER TABLE personas.personas
  ALTER COLUMN nombres TYPE varchar(50) USING nombres::varchar(50),
  ALTER COLUMN apellido_paterno TYPE varchar(30) USING apellido_paterno::varchar(30),
  ALTER COLUMN apellido_materno TYPE varchar(30) USING apellido_materno::varchar(30);
