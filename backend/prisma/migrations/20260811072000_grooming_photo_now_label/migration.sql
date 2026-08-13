UPDATE configuracion.parametros
SET etiqueta = 'Ahora',
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo_grupo = 'etapas_foto_peluqueria_spa'
  AND codigo = 'despues';

UPDATE configuracion.parametros_traducciones traduccion
SET etiqueta = CASE traduccion.codigo_idioma
    WHEN 'es' THEN 'Ahora'
    WHEN 'en' THEN 'Now'
    ELSE traduccion.etiqueta
  END,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration'
FROM configuracion.parametros parametro
WHERE traduccion.fid_parametros = parametro.id_parametros
  AND parametro.codigo_grupo = 'etapas_foto_peluqueria_spa'
  AND parametro.codigo = 'despues'
  AND traduccion.codigo_idioma IN ('es', 'en');
