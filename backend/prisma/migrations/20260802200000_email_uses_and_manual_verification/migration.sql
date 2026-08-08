CREATE TYPE personas.tipo_uso_correo AS ENUM ('principal', 'mensajes', 'respaldo');

ALTER TABLE personas.personas_correos
ADD CONSTRAINT personas_correos_id_persona_key
UNIQUE (id_personas_correos, fid_personas);

CREATE TABLE personas.personas_correos_usos (
  id_personas_correos_usos UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_personas UUID NOT NULL,
  fid_personas_correos UUID NOT NULL,
  tipo personas.tipo_uso_correo NOT NULL,
  estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  CONSTRAINT personas_correos_usos_persona_fk
    FOREIGN KEY (fid_personas)
    REFERENCES personas.personas(id_personas)
    ON DELETE CASCADE,
  CONSTRAINT personas_correos_usos_correo_persona_fk
    FOREIGN KEY (fid_personas_correos, fid_personas)
    REFERENCES personas.personas_correos(id_personas_correos, fid_personas)
    ON DELETE CASCADE,
  CONSTRAINT personas_correos_usos_persona_tipo_key
    UNIQUE (fid_personas, tipo)
);

CREATE INDEX personas_correos_usos_correo_idx
ON personas.personas_correos_usos(fid_personas_correos);

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON personas.personas_correos_usos
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

CREATE FUNCTION personas.validar_uso_correo_verificado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado = 1 AND NOT EXISTS (
    SELECT 1
    FROM personas.personas_correos AS correo
    WHERE correo.id_personas_correos = NEW.fid_personas_correos
      AND correo.fid_personas = NEW.fid_personas
      AND correo.estado = 1
      AND correo.verificado_en IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'El uso requiere un correo activo y verificado'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_correo_verificado
BEFORE INSERT OR UPDATE ON personas.personas_correos_usos
FOR EACH ROW EXECUTE FUNCTION personas.validar_uso_correo_verificado();

CREATE FUNCTION personas.retirar_usos_correo_no_verificado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado <> 1 OR NEW.verificado_en IS NULL THEN
    UPDATE personas.personas_correos_usos
    SET estado = 0,
        updated_by = COALESCE(NEW.updated_by, updated_by)
    WHERE fid_personas_correos = NEW.id_personas_correos
      AND fid_personas = NEW.fid_personas
      AND estado = 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER retirar_usos_si_no_verificado
AFTER UPDATE OF verificado_en, estado ON personas.personas_correos
FOR EACH ROW EXECUTE FUNCTION personas.retirar_usos_correo_no_verificado();

WITH correos_preferidos AS (
  SELECT DISTINCT ON (fid_personas)
    fid_personas,
    id_personas_correos,
    created_by,
    updated_by
  FROM personas.personas_correos
  WHERE estado = 1 AND verificado_en IS NOT NULL
  ORDER BY fid_personas, es_notificacion DESC, created_at ASC
)
INSERT INTO personas.personas_correos_usos
  (fid_personas, fid_personas_correos, tipo, created_by, updated_by)
SELECT fid_personas, id_personas_correos, tipo, created_by, updated_by
FROM correos_preferidos
CROSS JOIN (VALUES
  ('principal'::personas.tipo_uso_correo),
  ('mensajes'::personas.tipo_uso_correo),
  ('respaldo'::personas.tipo_uso_correo)
) AS usos(tipo);

DROP INDEX IF EXISTS personas.personas_correos_notificacion_unica_idx;
DROP INDEX IF EXISTS personas.personas_correos_fid_personas_es_notificacion_idx;
ALTER TABLE personas.personas_correos DROP COLUMN es_notificacion;
