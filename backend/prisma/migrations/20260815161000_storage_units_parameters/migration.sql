ALTER TABLE configuracion.parametros
  ADD COLUMN valor_entero bigint;

WITH unidades(id_parametros, codigo, etiqueta, factor_bytes, orden) AS (
  VALUES
    ('8a000000-0000-4000-8000-000000000001'::uuid, 'KB', 'KB', 1024::bigint, 10),
    ('8a000000-0000-4000-8000-000000000002'::uuid, 'MB', 'MB', 1048576::bigint, 20),
    ('8a000000-0000-4000-8000-000000000003'::uuid, 'GB', 'GB', 1073741824::bigint, 30)
)
INSERT INTO configuracion.parametros (
  id_parametros, codigo_grupo, codigo, etiqueta, valor_entero, orden,
  estado, created_by, updated_by
)
SELECT id_parametros, 'unidades_almacenamiento', codigo, etiqueta,
       factor_bytes, orden, 1, 'migration', 'migration'
FROM unidades
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  valor_entero = EXCLUDED.valor_entero,
  orden = EXCLUDED.orden,
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

INSERT INTO configuracion.parametros_traducciones (
  id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta,
  created_by, updated_by
)
SELECT gen_random_uuid(), parametro.id_parametros, idioma.codigo_idioma,
       parametro.etiqueta, 'migration', 'migration'
FROM configuracion.parametros parametro
CROSS JOIN (VALUES ('es'), ('en')) idioma(codigo_idioma)
WHERE parametro.codigo_grupo = 'unidades_almacenamiento'
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';
