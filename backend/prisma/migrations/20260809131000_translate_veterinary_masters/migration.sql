-- Etiquetas ES/EN de los maestros veterinarios añadidos en la normalización.
WITH etiquetas(codigo_grupo, codigo, etiqueta_es, etiqueta_en) AS (
  VALUES
    ('idiomas', 'es', 'Español', 'Spanish'),
    ('idiomas', 'en', 'Inglés', 'English'),
    ('monedas', 'PEN', 'Sol peruano (PEN)', 'Peruvian sol (PEN)'),
    ('monedas', 'USD', 'Dólar estadounidense (USD)', 'US dollar (USD)'),
    ('monedas', 'EUR', 'Euro (EUR)', 'Euro (EUR)'),
    ('monedas', 'MXN', 'Peso mexicano (MXN)', 'Mexican peso (MXN)'),
    ('tipos_persona_fiscal', 'persona_natural', 'Persona natural', 'Individual'),
    ('tipos_persona_fiscal', 'persona_juridica', 'Empresa', 'Company'),
    ('responsabilidades_fiscales', 'nuevo_rus', 'Nuevo RUS', 'New Simplified Single Regime'),
    ('responsabilidades_fiscales', 'regimen_especial_renta', 'Régimen Especial de Renta', 'Special Income Tax Regime'),
    ('responsabilidades_fiscales', 'regimen_mype_tributario', 'Régimen MYPE Tributario', 'MYPE Tax Regime'),
    ('responsabilidades_fiscales', 'regimen_general', 'Régimen General', 'General Tax Regime'),
    ('responsabilidades_fiscales', 'otro', 'Otra', 'Other')
), traducciones AS (
  SELECT parametro.id_parametros, idioma.codigo_idioma, idioma.etiqueta
  FROM etiquetas
  JOIN configuracion.parametros parametro
    ON parametro.codigo_grupo = etiquetas.codigo_grupo
   AND parametro.codigo = etiquetas.codigo
  CROSS JOIN LATERAL (
    VALUES ('es', etiquetas.etiqueta_es), ('en', etiquetas.etiqueta_en)
  ) idioma(codigo_idioma, etiqueta)
)
INSERT INTO configuracion.parametros_traducciones
  (id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta, created_by, updated_by)
SELECT gen_random_uuid(), id_parametros, codigo_idioma, etiqueta, 'migration', 'migration'
FROM traducciones
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';
