-- Catálogo territorial universal (ISO 3166-1 alfa-2 + niveles administrativos 0..3).
-- Los renombres conservan UUID, datos y relaciones existentes de Perú.
ALTER TABLE system.paises SET SCHEMA configuracion;
ALTER TABLE configuracion.paises RENAME TO admin_level_0;
ALTER TABLE configuracion.admin_level_0 RENAME COLUMN id_paises TO id_admin_level_0;
ALTER TABLE configuracion.admin_level_0
  ADD COLUMN etiqueta_admin_level_1 VARCHAR(50),
  ADD COLUMN etiqueta_admin_level_2 VARCHAR(50),
  ADD COLUMN etiqueta_admin_level_3 VARCHAR(50);
UPDATE configuracion.admin_level_0
SET etiqueta_admin_level_1 = 'Departamento',
    etiqueta_admin_level_2 = 'Provincia',
    etiqueta_admin_level_3 = 'Distrito'
WHERE codigo_iso2 = 'PE';
ALTER TABLE configuracion.admin_level_0
  ALTER COLUMN etiqueta_admin_level_1 SET NOT NULL,
  ALTER COLUMN etiqueta_admin_level_3 SET NOT NULL;

ALTER TABLE configuracion.departamentos RENAME TO admin_level_1;
ALTER TABLE configuracion.admin_level_1 RENAME COLUMN id_departamentos TO id_admin_level_1;
ALTER TABLE configuracion.admin_level_1 RENAME COLUMN codigo_ubigeo TO codigo;
ALTER TABLE configuracion.admin_level_1 ADD COLUMN fid_admin_level_0 UUID;
UPDATE configuracion.admin_level_1
SET fid_admin_level_0 = (
  SELECT id_admin_level_0 FROM configuracion.admin_level_0 WHERE codigo_iso2 = 'PE'
);
ALTER TABLE configuracion.admin_level_1 ALTER COLUMN fid_admin_level_0 SET NOT NULL;
ALTER TABLE configuracion.admin_level_1
  ALTER COLUMN codigo TYPE VARCHAR(20) USING BTRIM(codigo),
  ALTER COLUMN nombre TYPE VARCHAR(100);
ALTER TABLE configuracion.admin_level_1
  ADD CONSTRAINT admin_level_1_fid_admin_level_0_fkey
  FOREIGN KEY (fid_admin_level_0) REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT;
ALTER TABLE configuracion.admin_level_1 DROP CONSTRAINT IF EXISTS departamentos_codigo_ubigeo_key;
ALTER TABLE configuracion.admin_level_1
  ADD CONSTRAINT admin_level_1_fid_admin_level_0_codigo_key UNIQUE (fid_admin_level_0, codigo);
CREATE INDEX admin_level_1_fid_admin_level_0_idx
  ON configuracion.admin_level_1(fid_admin_level_0);

ALTER TABLE configuracion.provincias RENAME TO admin_level_2;
ALTER TABLE configuracion.admin_level_2 RENAME COLUMN id_provincias TO id_admin_level_2;
ALTER TABLE configuracion.admin_level_2 RENAME COLUMN fid_departamentos TO fid_admin_level_1;
ALTER TABLE configuracion.admin_level_2 RENAME COLUMN codigo_ubigeo TO codigo;
ALTER TABLE configuracion.admin_level_2
  ALTER COLUMN codigo TYPE VARCHAR(20) USING BTRIM(codigo),
  ALTER COLUMN nombre TYPE VARCHAR(100);
ALTER TABLE configuracion.admin_level_2 DROP CONSTRAINT IF EXISTS provincias_codigo_ubigeo_key;
ALTER TABLE configuracion.admin_level_2
  ADD CONSTRAINT admin_level_2_fid_admin_level_1_codigo_key UNIQUE (fid_admin_level_1, codigo),
  ADD CONSTRAINT admin_level_2_id_admin_level_2_fid_admin_level_1_key UNIQUE (id_admin_level_2, fid_admin_level_1);
ALTER INDEX IF EXISTS configuracion.provincias_fid_departamentos_idx
  RENAME TO admin_level_2_fid_admin_level_1_idx;

ALTER TABLE configuracion.distritos RENAME TO admin_level_3;
ALTER TABLE configuracion.admin_level_3 RENAME COLUMN id_distritos TO id_admin_level_3;
ALTER TABLE configuracion.admin_level_3 RENAME COLUMN fid_provincias TO fid_admin_level_2;
ALTER TABLE configuracion.admin_level_3 RENAME COLUMN ubigeo TO codigo;
ALTER TABLE configuracion.admin_level_3 ADD COLUMN fid_admin_level_1 UUID;
UPDATE configuracion.admin_level_3 AS nivel_3
SET fid_admin_level_1 = nivel_2.fid_admin_level_1
FROM configuracion.admin_level_2 AS nivel_2
WHERE nivel_2.id_admin_level_2 = nivel_3.fid_admin_level_2;
ALTER TABLE configuracion.admin_level_3
  ALTER COLUMN fid_admin_level_1 SET NOT NULL,
  ALTER COLUMN fid_admin_level_2 DROP NOT NULL,
  ALTER COLUMN codigo TYPE VARCHAR(20) USING BTRIM(codigo),
  ALTER COLUMN nombre TYPE VARCHAR(120);
ALTER TABLE configuracion.admin_level_3 DROP CONSTRAINT IF EXISTS distritos_ubigeo_key;
ALTER TABLE configuracion.admin_level_3 DROP CONSTRAINT IF EXISTS distritos_fid_provincias_fkey;
ALTER TABLE configuracion.admin_level_3
  ADD CONSTRAINT admin_level_3_fid_admin_level_1_fkey
    FOREIGN KEY (fid_admin_level_1) REFERENCES configuracion.admin_level_1(id_admin_level_1) ON DELETE RESTRICT,
  ADD CONSTRAINT admin_level_3_fid_admin_level_2_fid_admin_level_1_fkey
    FOREIGN KEY (fid_admin_level_2, fid_admin_level_1)
    REFERENCES configuracion.admin_level_2(id_admin_level_2, fid_admin_level_1) ON DELETE RESTRICT,
  ADD CONSTRAINT admin_level_3_fid_admin_level_1_codigo_key UNIQUE (fid_admin_level_1, codigo);
ALTER INDEX IF EXISTS configuracion.distritos_fid_provincias_idx
  RENAME TO admin_level_3_fid_admin_level_2_idx;
CREATE INDEX admin_level_3_fid_admin_level_1_idx
  ON configuracion.admin_level_3(fid_admin_level_1);

-- Preferencia regional: mismo país, nombre universal y misma relación.
ALTER TABLE seguridad.preferencias_usuario RENAME COLUMN fid_paises TO fid_admin_level_0;
ALTER INDEX IF EXISTS seguridad.preferencias_usuario_fid_paises_idx
  RENAME TO preferencias_usuario_fid_admin_level_0_idx;

-- La persona mantiene dos ubicaciones independientes: nacimiento y residencia.
ALTER TABLE personas.personas RENAME COLUMN fid_paises TO fid_admin_level_0_residencia;
ALTER TABLE personas.personas RENAME COLUMN fid_distritos TO fid_admin_level_3_residencia;
ALTER TABLE personas.personas RENAME COLUMN lugar_nacimiento TO ciudad_nacimiento;
ALTER TABLE personas.personas
  ADD COLUMN fid_admin_level_0_nacimiento UUID,
  ADD COLUMN fid_admin_level_3_nacimiento UUID;
ALTER TABLE personas.personas
  ADD CONSTRAINT personas_fid_admin_level_0_nacimiento_fkey
    FOREIGN KEY (fid_admin_level_0_nacimiento)
    REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT,
  ADD CONSTRAINT personas_fid_admin_level_3_nacimiento_fkey
    FOREIGN KEY (fid_admin_level_3_nacimiento)
    REFERENCES configuracion.admin_level_3(id_admin_level_3) ON DELETE RESTRICT,
  ADD CONSTRAINT personas_nacimiento_completo_check CHECK (
    (fid_admin_level_0_nacimiento IS NULL) = (fid_admin_level_3_nacimiento IS NULL)
  ),
  ADD CONSTRAINT personas_residencia_completa_check CHECK (
    (fid_admin_level_0_residencia IS NULL) = (fid_admin_level_3_residencia IS NULL)
  );
ALTER INDEX IF EXISTS personas.personas_fid_paises_idx
  RENAME TO personas_fid_admin_level_0_residencia_idx;
ALTER INDEX IF EXISTS personas.personas_fid_distritos_idx
  RENAME TO personas_fid_admin_level_3_residencia_idx;
CREATE INDEX personas_fid_admin_level_0_nacimiento_idx
  ON personas.personas(fid_admin_level_0_nacimiento);
CREATE INDEX personas_fid_admin_level_3_nacimiento_idx
  ON personas.personas(fid_admin_level_3_nacimiento);

-- Defensa final: el país declarado debe coincidir con el ancestro del nivel 3.
CREATE OR REPLACE FUNCTION personas.validar_ubicaciones_administrativas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  pais_nacimiento UUID;
  pais_residencia UUID;
BEGIN
  IF NEW.fid_admin_level_3_nacimiento IS NOT NULL THEN
    SELECT nivel_1.fid_admin_level_0 INTO pais_nacimiento
    FROM configuracion.admin_level_3 nivel_3
    JOIN configuracion.admin_level_1 nivel_1
      ON nivel_1.id_admin_level_1 = nivel_3.fid_admin_level_1
    WHERE nivel_3.id_admin_level_3 = NEW.fid_admin_level_3_nacimiento;
    IF pais_nacimiento IS DISTINCT FROM NEW.fid_admin_level_0_nacimiento THEN
      RAISE EXCEPTION 'La ubicación de nacimiento no pertenece al país indicado'
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

CREATE TRIGGER personas_validar_ubicaciones_administrativas
BEFORE INSERT OR UPDATE OF
  fid_admin_level_0_nacimiento,
  fid_admin_level_3_nacimiento,
  fid_admin_level_0_residencia,
  fid_admin_level_3_residencia
ON personas.personas
FOR EACH ROW EXECUTE FUNCTION personas.validar_ubicaciones_administrativas();
