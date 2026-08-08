-- Convierte identificadores camelCase/PascalCase a snake_case minúsculo sin recrear datos.
-- La expresión contempla límites normales y siglas: rucNif -> ruc_nif.

-- 1. Tipos enum.
DO $$
DECLARE
  objeto record;
  nombre_nuevo text;
BEGIN
  FOR objeto IN
    SELECT n.nspname AS esquema, t.typname AS nombre
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typtype = 'e'
      AND n.nspname IN ('seguridad', 'nucleo', 'personas', 'configuracion', 'eventos')
  LOOP
    nombre_nuevo := lower(
      regexp_replace(
        regexp_replace(objeto.nombre, '([A-Z]+)([A-Z][a-z])', '\1_\2', 'g'),
        '([a-z0-9])([A-Z])', '\1_\2', 'g'
      )
    );
    IF objeto.nombre <> nombre_nuevo THEN
      EXECUTE format(
        'ALTER TYPE %I.%I RENAME TO %I',
        objeto.esquema,
        objeto.nombre,
        nombre_nuevo
      );
    END IF;
  END LOOP;
END $$;

-- 2. Valores enum en minúsculas.
DO $$
DECLARE
  objeto record;
  valor_nuevo text;
BEGIN
  FOR objeto IN
    SELECT n.nspname AS esquema, t.typname AS tipo, e.enumlabel AS valor
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname IN ('seguridad', 'nucleo', 'personas', 'configuracion', 'eventos')
  LOOP
    valor_nuevo := lower(objeto.valor);
    IF objeto.valor <> valor_nuevo THEN
      EXECUTE format(
        'ALTER TYPE %I.%I RENAME VALUE %L TO %L',
        objeto.esquema,
        objeto.tipo,
        objeto.valor,
        valor_nuevo
      );
    END IF;
  END LOOP;
END $$;

-- 3. Tablas.
DO $$
DECLARE
  objeto record;
  nombre_nuevo text;
BEGIN
  FOR objeto IN
    SELECT n.nspname AS esquema, c.relname AS nombre
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p')
      AND n.nspname IN ('seguridad', 'nucleo', 'personas', 'configuracion', 'eventos')
  LOOP
    nombre_nuevo := lower(
      regexp_replace(
        regexp_replace(objeto.nombre, '([A-Z]+)([A-Z][a-z])', '\1_\2', 'g'),
        '([a-z0-9])([A-Z])', '\1_\2', 'g'
      )
    );
    IF objeto.nombre <> nombre_nuevo THEN
      EXECUTE format(
        'ALTER TABLE %I.%I RENAME TO %I',
        objeto.esquema,
        objeto.nombre,
        nombre_nuevo
      );
    END IF;
  END LOOP;
END $$;

-- 4. Columnas.
DO $$
DECLARE
  objeto record;
  nombre_nuevo text;
BEGIN
  FOR objeto IN
    SELECT table_schema AS esquema, table_name AS tabla, column_name AS nombre
    FROM information_schema.columns
    WHERE table_schema IN ('seguridad', 'nucleo', 'personas', 'configuracion', 'eventos')
  LOOP
    nombre_nuevo := lower(
      regexp_replace(
        regexp_replace(objeto.nombre, '([A-Z]+)([A-Z][a-z])', '\1_\2', 'g'),
        '([a-z0-9])([A-Z])', '\1_\2', 'g'
      )
    );
    IF objeto.nombre <> nombre_nuevo THEN
      EXECUTE format(
        'ALTER TABLE %I.%I RENAME COLUMN %I TO %I',
        objeto.esquema,
        objeto.tabla,
        objeto.nombre,
        nombre_nuevo
      );
    END IF;
  END LOOP;
END $$;

-- 5. Restricciones PK, FK y UNIQUE.
DO $$
DECLARE
  objeto record;
  nombre_nuevo text;
BEGIN
  FOR objeto IN
    SELECT n.nspname AS esquema, c.relname AS tabla, con.conname AS nombre
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('seguridad', 'nucleo', 'personas', 'configuracion', 'eventos')
  LOOP
    nombre_nuevo := lower(
      regexp_replace(
        regexp_replace(objeto.nombre, '([A-Z]+)([A-Z][a-z])', '\1_\2', 'g'),
        '([a-z0-9])([A-Z])', '\1_\2', 'g'
      )
    );
    IF objeto.nombre <> nombre_nuevo THEN
      EXECUTE format(
        'ALTER TABLE %I.%I RENAME CONSTRAINT %I TO %I',
        objeto.esquema,
        objeto.tabla,
        objeto.nombre,
        nombre_nuevo
      );
    END IF;
  END LOOP;
END $$;

-- 6. Índices no renombrados automáticamente con sus restricciones.
DO $$
DECLARE
  objeto record;
  nombre_nuevo text;
BEGIN
  FOR objeto IN
    SELECT n.nspname AS esquema, c.relname AS nombre
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname IN ('seguridad', 'nucleo', 'personas', 'configuracion', 'eventos')
  LOOP
    nombre_nuevo := lower(
      regexp_replace(
        regexp_replace(objeto.nombre, '([A-Z]+)([A-Z][a-z])', '\1_\2', 'g'),
        '([a-z0-9])([A-Z])', '\1_\2', 'g'
      )
    );
    IF objeto.nombre <> nombre_nuevo THEN
      EXECUTE format(
        'ALTER INDEX %I.%I RENAME TO %I',
        objeto.esquema,
        objeto.nombre,
        nombre_nuevo
      );
    END IF;
  END LOOP;
END $$;
