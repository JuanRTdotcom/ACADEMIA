WITH opciones(codigo, etiqueta_es, etiqueta_en, orden) AS (
  VALUES
    ('guarderia', 'Guardería', 'Daycare', 10),
    ('hotel', 'Hotel', 'Hotel', 20)
)
INSERT INTO configuracion.parametros (
  id_parametros,
  codigo_grupo,
  codigo,
  etiqueta,
  orden,
  estado,
  created_by,
  updated_by
)
SELECT
  gen_random_uuid(),
  'tipos_estancia_guarderia',
  codigo,
  etiqueta_es,
  orden,
  1,
  'migration',
  'migration'
FROM opciones
ON CONFLICT (codigo_grupo, codigo) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta,
    orden = EXCLUDED.orden,
    estado = 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration';

WITH opciones(codigo, etiqueta_es, etiqueta_en) AS (
  VALUES
    ('guarderia', 'Guardería', 'Daycare'),
    ('hotel', 'Hotel', 'Hotel')
), traducciones AS (
  SELECT parametro.id_parametros,
         idioma.codigo_idioma,
         idioma.etiqueta
  FROM opciones
  JOIN configuracion.parametros parametro
    ON parametro.codigo_grupo = 'tipos_estancia_guarderia'
   AND parametro.codigo = opciones.codigo
  CROSS JOIN LATERAL (
    VALUES ('es', opciones.etiqueta_es), ('en', opciones.etiqueta_en)
  ) idioma(codigo_idioma, etiqueta)
)
INSERT INTO configuracion.parametros_traducciones (
  id_parametros_traducciones,
  fid_parametros,
  codigo_idioma,
  etiqueta,
  created_by,
  updated_by
)
SELECT gen_random_uuid(), id_parametros, codigo_idioma, etiqueta, 'migration', 'migration'
FROM traducciones
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration';

ALTER TABLE personas.registros_atencion
  ADD COLUMN IF NOT EXISTS fid_parametros_tipo_estancia_guarderia uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registros_atencion_tipo_estancia_guarderia_fk'
      AND conrelid = 'personas.registros_atencion'::regclass
  ) THEN
    ALTER TABLE personas.registros_atencion
      ADD CONSTRAINT registros_atencion_tipo_estancia_guarderia_fk
      FOREIGN KEY (fid_parametros_tipo_estancia_guarderia)
      REFERENCES configuracion.parametros(id_parametros)
      ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS registros_atencion_tipo_estancia_guarderia_idx
  ON personas.registros_atencion(fid_parametros_tipo_estancia_guarderia);

UPDATE configuracion.tipos_registro_atencion
SET nombre_es = 'Guardería / hotel',
    nombre_en = 'Daycare / hotel',
    descripcion_es = 'Registra la estancia, alimentación, pertenencias y recomendaciones de cuidado.',
    descripcion_en = 'Records the stay, feeding, belongings, and care recommendations.',
    icono = 'house',
    campos = '[
      {"clave":"fecha_ingreso","etiqueta_es":"Fecha y hora de ingreso","etiqueta_en":"Check-in date and time","tipo":"datetime","requerido":true},
      {"clave":"fecha_salida","etiqueta_es":"Fecha y hora de salida","etiqueta_en":"Check-out date and time","tipo":"datetime","requerido":false},
      {"clave":"fid_parametros_tipo_estancia_guarderia","etiqueta_es":"Tipo","etiqueta_en":"Type","tipo":"uuid","fuente":"tipos_estancia_guarderia","requerido":true},
      {"clave":"tipo_comida","etiqueta_es":"Tipo de comida","etiqueta_en":"Food type","tipo":"text","requerido":false,"max":160},
      {"clave":"cantidad_comida","etiqueta_es":"Cantidad de comida","etiqueta_en":"Food amount","tipo":"text","requerido":false,"max":120},
      {"clave":"objetos_mascota","etiqueta_es":"Objetos de la mascota","etiqueta_en":"Pet belongings","tipo":"textarea","requerido":false,"max":1500},
      {"clave":"observaciones_recomendaciones","etiqueta_es":"Observaciones / recomendaciones","etiqueta_en":"Notes / recommendations","tipo":"textarea","requerido":false,"max":3000}
    ]'::jsonb,
    acepta_adjuntos = false,
    max_adjuntos = NULL,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'guarderia';
