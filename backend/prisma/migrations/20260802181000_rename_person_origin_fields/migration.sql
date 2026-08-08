-- Procedencia describe de dónde proviene la persona; no implica lugar de nacimiento.
ALTER TABLE personas.personas
  RENAME COLUMN fid_admin_level_0_nacimiento TO fid_admin_level_0_procedencia;
ALTER TABLE personas.personas
  RENAME COLUMN fid_admin_level_3_nacimiento TO fid_admin_level_3_procedencia;

ALTER TABLE personas.personas
  RENAME CONSTRAINT personas_fid_admin_level_0_nacimiento_fkey
  TO personas_fid_admin_level_0_procedencia_fkey;
ALTER TABLE personas.personas
  RENAME CONSTRAINT personas_fid_admin_level_3_nacimiento_fkey
  TO personas_fid_admin_level_3_procedencia_fkey;
ALTER TABLE personas.personas
  RENAME CONSTRAINT personas_nacimiento_completo_check
  TO personas_procedencia_completa_check;

ALTER INDEX personas.personas_fid_admin_level_0_nacimiento_idx
  RENAME TO personas_fid_admin_level_0_procedencia_idx;
ALTER INDEX personas.personas_fid_admin_level_3_nacimiento_idx
  RENAME TO personas_fid_admin_level_3_procedencia_idx;

CREATE OR REPLACE FUNCTION personas.validar_ubicaciones_administrativas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  pais_procedencia UUID;
  pais_residencia UUID;
BEGIN
  IF NEW.fid_admin_level_3_procedencia IS NOT NULL THEN
    SELECT nivel_1.fid_admin_level_0 INTO pais_procedencia
    FROM configuracion.admin_level_3 nivel_3
    JOIN configuracion.admin_level_1 nivel_1
      ON nivel_1.id_admin_level_1 = nivel_3.fid_admin_level_1
    WHERE nivel_3.id_admin_level_3 = NEW.fid_admin_level_3_procedencia;
    IF pais_procedencia IS DISTINCT FROM NEW.fid_admin_level_0_procedencia THEN
      RAISE EXCEPTION 'La procedencia no pertenece al país indicado'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.fid_admin_level_3_residencia IS NOT NULL THEN
    SELECT nivel_1.fid_admin_level_0 INTO pais_residencia
    FROM configuracion.admin_level_3 nivel_3
    JOIN configuracion.admin_level_1 nivel_1
      ON nivel_1.id_admin_level_1 = nivel_3.fid_admin_level_1
    WHERE nivel_3.id_admin_level_3 = NEW.fid_admin_level_3_residencia;
    IF pais_residencia IS DISTINCT FROM NEW.fid_admin_level_0_residencia THEN
      RAISE EXCEPTION 'La ubicación de residencia no pertenece al país indicado'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER personas_validar_ubicaciones_administrativas ON personas.personas;
CREATE TRIGGER personas_validar_ubicaciones_administrativas
BEFORE INSERT OR UPDATE OF
  fid_admin_level_0_procedencia,
  fid_admin_level_3_procedencia,
  fid_admin_level_0_residencia,
  fid_admin_level_3_residencia
ON personas.personas
FOR EACH ROW EXECUTE FUNCTION personas.validar_ubicaciones_administrativas();
