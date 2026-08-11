WITH tipos(codigo, etiqueta_es, etiqueta_en, orden) AS (
  VALUES
    ('interna', 'Interna', 'Internal', 10),
    ('externa', 'Externa', 'External', 20),
    ('mixta_amplio_espectro', 'Mixta / amplio espectro', 'Combined / broad-spectrum', 30),
    ('otro', 'Otro', 'Other', 40)
)
INSERT INTO configuracion.parametros (
  id_parametros, codigo_grupo, codigo, etiqueta, orden, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), 'tipos_desparasitacion', codigo, etiqueta_es, orden,
       1, 'migration', 'migration'
FROM tipos
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  orden = EXCLUDED.orden,
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

WITH tipos(codigo, etiqueta_es, etiqueta_en) AS (
  VALUES
    ('interna', 'Interna', 'Internal'),
    ('externa', 'Externa', 'External'),
    ('mixta_amplio_espectro', 'Mixta / amplio espectro', 'Combined / broad-spectrum'),
    ('otro', 'Otro', 'Other')
), traducciones AS (
  SELECT parametro.id_parametros, idioma.codigo_idioma, idioma.etiqueta
  FROM tipos
  JOIN configuracion.parametros parametro
    ON parametro.codigo_grupo = 'tipos_desparasitacion'
   AND parametro.codigo = tipos.codigo
  CROSS JOIN LATERAL (
    VALUES ('es', tipos.etiqueta_es), ('en', tipos.etiqueta_en)
  ) idioma(codigo_idioma, etiqueta)
)
INSERT INTO configuracion.parametros_traducciones (
  id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta,
  created_by, updated_by
)
SELECT gen_random_uuid(), id_parametros, codigo_idioma, etiqueta,
       'migration', 'migration'
FROM traducciones
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

ALTER TABLE configuracion.tipos_registro_atencion
  ADD COLUMN max_adjuntos smallint;

ALTER TABLE configuracion.tipos_registro_atencion
  ADD CONSTRAINT tipos_registro_atencion_max_adjuntos_check
  CHECK (max_adjuntos IS NULL OR max_adjuntos BETWEEN 1 AND 50);

UPDATE configuracion.tipos_registro_atencion
SET max_adjuntos = 10,
    updated_by = 'migration'
WHERE codigo = 'consulta';

UPDATE configuracion.tipos_registro_atencion
SET acepta_adjuntos = true,
    max_adjuntos = 2,
    campos = '[
      {"clave":"fecha_ultima_desparasitacion","etiqueta_es":"Fecha de última desparasitación","etiqueta_en":"Last deworming date","tipo":"date","requerido":false,"precarga":"fecha_ultimo_registro","ayuda_precarga_es":"Última desparasitación encontrada","ayuda_precarga_en":"Last deworming record found"},
      {"clave":"fid_parametros_tipo_desparasitacion","etiqueta_es":"Tipo","etiqueta_en":"Type","tipo":"uuid","fuente":"tipos_desparasitacion","requerido":true},
      {"clave":"producto","etiqueta_es":"Producto","etiqueta_en":"Product","tipo":"text","requerido":true,"max":160},
      {"clave":"dosis","etiqueta_es":"Dosis","etiqueta_en":"Dose","tipo":"text","requerido":false,"max":120},
      {"clave":"fecha_programada","etiqueta_es":"Próximo control","etiqueta_en":"Next follow-up","tipo":"date","requerido":false},
      {"clave":"observaciones","etiqueta_es":"Observaciones","etiqueta_en":"Notes","tipo":"textarea","requerido":false,"max":2000}
    ]'::jsonb,
    updated_by = 'migration'
WHERE codigo = 'desparasitacion';

ALTER TABLE personas.registros_atencion
  ADD COLUMN fid_parametros_tipo_desparasitacion uuid,
  ADD CONSTRAINT registros_atencion_tipo_desparasitacion_fk
    FOREIGN KEY (fid_parametros_tipo_desparasitacion)
    REFERENCES configuracion.parametros(id_parametros)
    ON DELETE RESTRICT;

CREATE INDEX registros_atencion_tipo_desparasitacion_idx
  ON personas.registros_atencion(fid_parametros_tipo_desparasitacion);
