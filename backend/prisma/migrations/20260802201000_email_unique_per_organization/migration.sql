DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM personas.personas_correos AS correo
    JOIN personas.personas AS persona
      ON persona.id_personas = correo.fid_personas
    GROUP BY persona.fid_organizaciones, correo.correo
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existen correos duplicados dentro de una organización';
  END IF;
END;
$$;

ALTER TABLE personas.personas
ADD CONSTRAINT personas_id_organizacion_key
UNIQUE (id_personas, fid_organizaciones);

ALTER TABLE personas.personas_correos
ADD COLUMN fid_organizaciones UUID;

UPDATE personas.personas_correos AS correo
SET fid_organizaciones = persona.fid_organizaciones
FROM personas.personas AS persona
WHERE persona.id_personas = correo.fid_personas;

ALTER TABLE personas.personas_correos
ALTER COLUMN fid_organizaciones SET NOT NULL;

ALTER TABLE personas.personas_correos
DROP CONSTRAINT personas_correos_fid_personas_fkey;

ALTER TABLE personas.personas_correos
DROP CONSTRAINT personas_correos_fid_personas_correo_key;

ALTER TABLE personas.personas_correos
ADD CONSTRAINT personas_correos_persona_organizacion_fk
FOREIGN KEY (fid_personas, fid_organizaciones)
REFERENCES personas.personas(id_personas, fid_organizaciones)
ON DELETE CASCADE;

ALTER TABLE personas.personas_correos
ADD CONSTRAINT personas_correos_organizacion_correo_key
UNIQUE (fid_organizaciones, correo);

CREATE INDEX personas_correos_organizacion_estado_idx
ON personas.personas_correos(fid_organizaciones, estado);
