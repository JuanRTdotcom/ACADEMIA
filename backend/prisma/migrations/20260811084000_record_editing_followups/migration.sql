ALTER TABLE configuracion.tipos_registro_atencion
  ADD COLUMN permite_registro_raiz boolean NOT NULL DEFAULT true,
  ADD COLUMN requiere_registro_origen boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT tipos_registro_atencion_origen_check
    CHECK (NOT requiere_registro_origen OR NOT permite_registro_raiz);

WITH opciones(codigo, etiqueta_es, etiqueta_en, orden) AS (
  VALUES
    ('no_especificado', 'No especificado', 'Unspecified', 10),
    ('revision_consulta', 'Revisión de consulta', 'Consultation review', 20),
    ('reporte_evolucion', 'Reporte de evolución', 'Progress report', 30),
    ('carga_anexos', 'Carga de anexos', 'Attachment upload', 40),
    ('evaluacion_fisica', 'Evaluación física', 'Physical evaluation', 50),
    ('hospitalario', 'Hospitalario', 'Hospital', 60),
    ('control_interno', 'Control interno', 'Internal follow-up', 70),
    ('procedimiento_no_quirurgico', 'Procedimiento no quirúrgico', 'Non-surgical procedure', 80),
    ('aplicacion_medicamentos', 'Aplicación de medicamentos', 'Medication administration', 90),
    ('guarderia_hotel', 'Guardería / hotel', 'Daycare / hotel', 100),
    ('ambulatorio', 'Ambulatorio', 'Outpatient', 110),
    ('ambulatorio_casa', 'Ambulatorio en casa', 'Home outpatient care', 120)
)
INSERT INTO configuracion.parametros (
  id_parametros, codigo_grupo, codigo, etiqueta, orden, estado, created_by, updated_by
)
SELECT gen_random_uuid(), 'tipos_seguimiento_atencion', codigo, etiqueta_es, orden, 1, 'migration', 'migration'
FROM opciones
ON CONFLICT (codigo_grupo, codigo) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta,
    orden = EXCLUDED.orden,
    estado = 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration';

WITH opciones(codigo, etiqueta_es, etiqueta_en) AS (
  VALUES
    ('no_especificado', 'No especificado', 'Unspecified'),
    ('revision_consulta', 'Revisión de consulta', 'Consultation review'),
    ('reporte_evolucion', 'Reporte de evolución', 'Progress report'),
    ('carga_anexos', 'Carga de anexos', 'Attachment upload'),
    ('evaluacion_fisica', 'Evaluación física', 'Physical evaluation'),
    ('hospitalario', 'Hospitalario', 'Hospital'),
    ('control_interno', 'Control interno', 'Internal follow-up'),
    ('procedimiento_no_quirurgico', 'Procedimiento no quirúrgico', 'Non-surgical procedure'),
    ('aplicacion_medicamentos', 'Aplicación de medicamentos', 'Medication administration'),
    ('guarderia_hotel', 'Guardería / hotel', 'Daycare / hotel'),
    ('ambulatorio', 'Ambulatorio', 'Outpatient'),
    ('ambulatorio_casa', 'Ambulatorio en casa', 'Home outpatient care')
), traducciones AS (
  SELECT parametro.id_parametros, idioma.codigo_idioma, idioma.etiqueta
  FROM opciones
  JOIN configuracion.parametros parametro
    ON parametro.codigo_grupo = 'tipos_seguimiento_atencion'
   AND parametro.codigo = opciones.codigo
  CROSS JOIN LATERAL (
    VALUES ('es', opciones.etiqueta_es), ('en', opciones.etiqueta_en)
  ) idioma(codigo_idioma, etiqueta)
)
INSERT INTO configuracion.parametros_traducciones (
  id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta, created_by, updated_by
)
SELECT gen_random_uuid(), id_parametros, codigo_idioma, etiqueta, 'migration', 'migration'
FROM traducciones
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration';

ALTER TABLE personas.registros_atencion
  ADD COLUMN fid_registros_atencion_origen uuid,
  ADD COLUMN fid_parametros_tipo_seguimiento uuid,
  ADD CONSTRAINT registros_atencion_origen_tenant_fk
    FOREIGN KEY (fid_registros_atencion_origen, fid_organizaciones)
    REFERENCES personas.registros_atencion(id_registros_atencion, fid_organizaciones)
    ON DELETE RESTRICT,
  ADD CONSTRAINT registros_atencion_tipo_seguimiento_fk
    FOREIGN KEY (fid_parametros_tipo_seguimiento)
    REFERENCES configuracion.parametros(id_parametros)
    ON DELETE RESTRICT;

CREATE INDEX registros_atencion_origen_idx
  ON personas.registros_atencion(fid_registros_atencion_origen, eliminado_en, created_at DESC);
CREATE INDEX registros_atencion_tipo_seguimiento_idx
  ON personas.registros_atencion(fid_parametros_tipo_seguimiento);

UPDATE configuracion.tipos_registro_atencion
SET nombre_es = 'Seguimiento',
    nombre_en = 'Follow-up',
    descripcion_es = 'Evolución y control asociado a un registro clínico existente.',
    descripcion_en = 'Progress and control linked to an existing clinical record.',
    icono = 'message-circle',
    campos = '[
      {"clave":"fid_parametros_tipo_seguimiento","etiqueta_es":"Tipo de seguimiento","etiqueta_en":"Follow-up type","tipo":"uuid","fuente":"tipos_seguimiento_atencion","requerido":true},
      {"clave":"motivo","etiqueta_es":"Motivo","etiqueta_en":"Reason","tipo":"text","requerido":false,"max":500},
      {"clave":"detalle_seguimiento","etiqueta_es":"Detalle del seguimiento","etiqueta_en":"Follow-up details","tipo":"textarea","requerido":true,"max":4000},
      {"clave":"fecha_programada","etiqueta_es":"Próximo control","etiqueta_en":"Next follow-up","tipo":"date","requerido":false}
    ]'::jsonb,
    acepta_adjuntos = true,
    max_adjuntos = 10,
    permite_registro_raiz = false,
    requiere_registro_origen = true,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'seguimiento';
