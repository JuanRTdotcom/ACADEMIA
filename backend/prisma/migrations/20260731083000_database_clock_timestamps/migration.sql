-- Los instantes se almacenan con zona horaria. Los valores históricos fueron
-- escritos en UTC, por eso se interpretan explícitamente como UTC al convertir.
DO $$
DECLARE
  columna record;
BEGIN
  FOR columna IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema IN ('configuracion', 'eventos', 'nucleo', 'personas', 'seguridad')
      AND data_type = 'timestamp without time zone'
      AND column_name <> 'fecha_nacimiento'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN %I TYPE timestamptz(3) USING %I AT TIME ZONE ''UTC''',
      columna.table_schema,
      columna.table_name,
      columna.column_name,
      columna.column_name
    );
  END LOOP;
END $$;

-- Una fecha de nacimiento no es un instante ni necesita zona horaria.
ALTER TABLE personas.personas
  ALTER COLUMN fecha_nacimiento TYPE date
  USING fecha_nacimiento::date;

-- PostgreSQL, no Prisma/Nest, mantiene updated_at.
CREATE OR REPLACE FUNCTION configuracion.establecer_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tabla record;
BEGIN
  FOR tabla IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema IN ('configuracion', 'eventos', 'nucleo', 'personas', 'seguridad')
      AND column_name = 'updated_at'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP',
      tabla.table_schema,
      tabla.table_name
    );
    EXECUTE format(
      'DROP TRIGGER IF EXISTS establecer_updated_at ON %I.%I',
      tabla.table_schema,
      tabla.table_name
    );
    EXECUTE format(
      'CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at()',
      tabla.table_schema,
      tabla.table_name
    );
  END LOOP;
END $$;
