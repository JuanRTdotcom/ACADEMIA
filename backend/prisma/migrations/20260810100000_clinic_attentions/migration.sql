WITH estados(codigo, etiqueta_es, etiqueta_en, orden, color_hex) AS (
  VALUES
    ('en_espera', 'En espera', 'Waiting', 10, '#CA8A04'),
    ('en_atencion', 'En atención', 'In progress', 20, '#2563EB'),
    ('finalizada', 'Finalizada', 'Completed', 30, '#16A34A'),
    ('cancelada', 'Cancelada', 'Cancelled', 40, '#DC2626')
)
INSERT INTO configuracion.parametros (
  id_parametros, codigo_grupo, codigo, etiqueta, orden, color_hex, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), 'estados_atencion', codigo, etiqueta_es, orden,
       color_hex, 1, 'migration', 'migration'
FROM estados
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  orden = EXCLUDED.orden,
  color_hex = EXCLUDED.color_hex,
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

WITH estados(codigo, etiqueta_es, etiqueta_en) AS (
  VALUES
    ('en_espera', 'En espera', 'Waiting'),
    ('en_atencion', 'En atención', 'In progress'),
    ('finalizada', 'Finalizada', 'Completed'),
    ('cancelada', 'Cancelada', 'Cancelled')
), traducciones AS (
  SELECT parametro.id_parametros, idioma.codigo_idioma, idioma.etiqueta
  FROM estados
  JOIN configuracion.parametros parametro
    ON parametro.codigo_grupo = 'estados_atencion'
   AND parametro.codigo = estados.codigo
  CROSS JOIN LATERAL (
    VALUES ('es', estados.etiqueta_es), ('en', estados.etiqueta_en)
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

CREATE TABLE configuracion.tipos_registro_atencion (
  id_tipos_registro_atencion uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(60) NOT NULL UNIQUE,
  nombre_es varchar(100) NOT NULL,
  nombre_en varchar(100) NOT NULL,
  descripcion_es varchar(250) NOT NULL,
  descripcion_en varchar(250) NOT NULL,
  icono varchar(40) NOT NULL,
  color_hex varchar(7) NOT NULL,
  campos jsonb NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  CONSTRAINT tipos_registro_atencion_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT tipos_registro_atencion_color_check CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT tipos_registro_atencion_campos_check CHECK (jsonb_typeof(campos) = 'array')
);

INSERT INTO configuracion.tipos_registro_atencion (
  codigo, nombre_es, nombre_en, descripcion_es, descripcion_en, icono,
  color_hex, campos, orden, created_by, updated_by
)
VALUES
  ('consulta', 'Consulta', 'Consultation',
   'Evaluación clínica, diagnóstico y plan de manejo.',
   'Clinical assessment, diagnosis and care plan.',
   'stethoscope', '#2563EB',
   '[{"clave":"motivo","etiqueta_es":"Motivo de consulta","etiqueta_en":"Reason for consultation","tipo":"textarea","requerido":true,"max":1000},{"clave":"anamnesis","etiqueta_es":"Antecedentes y relato","etiqueta_en":"History","tipo":"textarea","requerido":false,"max":4000},{"clave":"hallazgos","etiqueta_es":"Hallazgos clínicos","etiqueta_en":"Clinical findings","tipo":"textarea","requerido":false,"max":4000},{"clave":"diagnostico","etiqueta_es":"Diagnóstico","etiqueta_en":"Diagnosis","tipo":"textarea","requerido":false,"max":2000},{"clave":"plan","etiqueta_es":"Plan e indicaciones","etiqueta_en":"Plan and directions","tipo":"textarea","requerido":false,"max":2000}]'::jsonb, 10, 'migration', 'migration'),
  ('vacunacion', 'Vacunación', 'Vaccination',
   'Registra cada vacuna aplicada y su próxima dosis.',
   'Records each vaccine and its next dose.',
   'syringe', '#16A34A',
   '[{"clave":"vacuna","etiqueta_es":"Vacuna","etiqueta_en":"Vaccine","tipo":"text","requerido":true,"max":160},{"clave":"fabricante","etiqueta_es":"Fabricante","etiqueta_en":"Manufacturer","tipo":"text","requerido":false,"max":120},{"clave":"lote","etiqueta_es":"Lote","etiqueta_en":"Batch","tipo":"text","requerido":false,"max":80},{"clave":"dosis","etiqueta_es":"Dosis","etiqueta_en":"Dose","tipo":"text","requerido":false,"max":80},{"clave":"via","etiqueta_es":"Vía de aplicación","etiqueta_en":"Route","tipo":"text","requerido":false,"max":80},{"clave":"fecha_programada","etiqueta_es":"Próxima dosis","etiqueta_en":"Next dose","tipo":"date","requerido":false}]'::jsonb, 20, 'migration', 'migration'),
  ('formula_medica', 'Fórmula médica', 'Prescription',
   'Medicamentos, dosis, frecuencia e indicaciones.',
   'Medication, dosage, frequency and directions.',
   'pill', '#7C3AED',
   '[{"clave":"medicamento","etiqueta_es":"Medicamento","etiqueta_en":"Medication","tipo":"text","requerido":true,"max":160},{"clave":"presentacion","etiqueta_es":"Presentación","etiqueta_en":"Presentation","tipo":"text","requerido":false,"max":120},{"clave":"dosis","etiqueta_es":"Dosis","etiqueta_en":"Dose","tipo":"text","requerido":false,"max":120},{"clave":"frecuencia","etiqueta_es":"Frecuencia","etiqueta_en":"Frequency","tipo":"text","requerido":false,"max":120},{"clave":"duracion","etiqueta_es":"Duración","etiqueta_en":"Duration","tipo":"text","requerido":false,"max":120},{"clave":"indicaciones","etiqueta_es":"Indicaciones","etiqueta_en":"Directions","tipo":"textarea","requerido":false,"max":2000}]'::jsonb, 30, 'migration', 'migration'),
  ('desparasitacion', 'Desparasitación', 'Deworming',
   'Producto, dosis y próxima aplicación.',
   'Product, dosage and next application.',
   'shield-plus', '#0F766E',
   '[{"clave":"producto","etiqueta_es":"Producto","etiqueta_en":"Product","tipo":"text","requerido":true,"max":160},{"clave":"dosis","etiqueta_es":"Dosis","etiqueta_en":"Dose","tipo":"text","requerido":false,"max":120},{"clave":"via","etiqueta_es":"Vía de administración","etiqueta_en":"Route","tipo":"text","requerido":false,"max":80},{"clave":"fecha_programada","etiqueta_es":"Próxima aplicación","etiqueta_en":"Next application","tipo":"date","requerido":false}]'::jsonb, 40, 'migration', 'migration'),
  ('hospitalizacion_ambulatorio', 'Hospitalización / ambulatorio', 'Hospitalization / outpatient',
   'Ingreso, manejo ambulatorio e indicaciones de alta.',
   'Admission, outpatient care and discharge directions.',
   'hospital', '#DC2626',
   '[{"clave":"modalidad","etiqueta_es":"Tipo de atención","etiqueta_en":"Care type","tipo":"text","requerido":true,"max":120},{"clave":"motivo","etiqueta_es":"Motivo","etiqueta_en":"Reason","tipo":"textarea","requerido":true,"max":1000},{"clave":"indicaciones","etiqueta_es":"Indicaciones y cuidados","etiqueta_en":"Care directions","tipo":"textarea","requerido":false,"max":3000},{"clave":"fecha_programada","etiqueta_es":"Alta prevista","etiqueta_en":"Expected discharge","tipo":"date","requerido":false}]'::jsonb, 50, 'migration', 'migration'),
  ('cirugia_procedimiento', 'Cirugía / procedimiento', 'Surgery / procedure',
   'Procedimientos, anestesia y resultado clínico.',
   'Procedures, anesthesia and clinical outcome.',
   'scissors', '#EA580C',
   '[{"clave":"procedimiento","etiqueta_es":"Procedimiento","etiqueta_en":"Procedure","tipo":"text","requerido":true,"max":180},{"clave":"indicacion","etiqueta_es":"Indicación","etiqueta_en":"Indication","tipo":"textarea","requerido":false,"max":1500},{"clave":"anestesia","etiqueta_es":"Anestesia o sedación","etiqueta_en":"Anesthesia or sedation","tipo":"text","requerido":false,"max":200},{"clave":"resultado","etiqueta_es":"Resultado y observaciones","etiqueta_en":"Outcome and notes","tipo":"textarea","requerido":false,"max":3000}]'::jsonb, 60, 'migration', 'migration'),
  ('laboratorio', 'Examen de laboratorio', 'Laboratory test',
   'Solicitud, muestra y resultados de laboratorio.',
   'Laboratory request, sample and results.',
   'flask-conical', '#0891B2',
   '[{"clave":"examen","etiqueta_es":"Examen solicitado","etiqueta_en":"Requested test","tipo":"text","requerido":true,"max":180},{"clave":"muestra","etiqueta_es":"Tipo de muestra","etiqueta_en":"Sample type","tipo":"text","requerido":false,"max":120},{"clave":"fecha_programada","etiqueta_es":"Fecha programada","etiqueta_en":"Scheduled date","tipo":"date","requerido":false},{"clave":"resultado","etiqueta_es":"Resultado u observaciones","etiqueta_en":"Result or notes","tipo":"textarea","requerido":false,"max":4000}]'::jsonb, 70, 'migration', 'migration'),
  ('imagen_diagnostica', 'Imagen diagnóstica', 'Diagnostic imaging',
   'Radiografías, ecografías y otros estudios de imagen.',
   'X-rays, ultrasound and other imaging studies.',
   'images', '#4F46E5',
   '[{"clave":"estudio","etiqueta_es":"Tipo de estudio","etiqueta_en":"Study type","tipo":"text","requerido":true,"max":180},{"clave":"zona","etiqueta_es":"Zona evaluada","etiqueta_en":"Body area","tipo":"text","requerido":false,"max":160},{"clave":"motivo","etiqueta_es":"Motivo","etiqueta_en":"Reason","tipo":"textarea","requerido":false,"max":1000},{"clave":"hallazgos","etiqueta_es":"Hallazgos","etiqueta_en":"Findings","tipo":"textarea","requerido":false,"max":4000}]'::jsonb, 80, 'migration', 'migration'),
  ('peluqueria_spa', 'Peluquería y spa', 'Grooming and spa',
   'Servicios estéticos y cuidados solicitados.',
   'Grooming services and requested care.',
   'sparkles', '#DB2777',
   '[{"clave":"servicio","etiqueta_es":"Servicio solicitado","etiqueta_en":"Requested service","tipo":"text","requerido":true,"max":180},{"clave":"indicaciones","etiqueta_es":"Indicaciones especiales","etiqueta_en":"Special directions","tipo":"textarea","requerido":false,"max":2000}]'::jsonb, 90, 'migration', 'migration'),
  ('guarderia', 'Guardería', 'Daycare',
   'Estancia, cuidados y hora prevista de retiro.',
   'Stay, care and expected pickup time.',
   'house', '#65A30D',
   '[{"clave":"modalidad","etiqueta_es":"Tipo de estancia","etiqueta_en":"Stay type","tipo":"text","requerido":true,"max":120},{"clave":"indicaciones","etiqueta_es":"Cuidados e indicaciones","etiqueta_en":"Care directions","tipo":"textarea","requerido":false,"max":2000},{"clave":"programado_para","etiqueta_es":"Retiro programado","etiqueta_en":"Scheduled pickup","tipo":"datetime","requerido":false}]'::jsonb, 100, 'migration', 'migration'),
  ('seguimiento', 'Seguimiento', 'Follow-up',
   'Control posterior presencial o remoto.',
   'Later in-person or remote follow-up.',
   'history', '#0284C7',
   '[{"clave":"motivo","etiqueta_es":"Motivo del seguimiento","etiqueta_en":"Follow-up reason","tipo":"text","requerido":true,"max":180},{"clave":"canal","etiqueta_es":"Canal o modalidad","etiqueta_en":"Channel or mode","tipo":"text","requerido":false,"max":100},{"clave":"programado_para","etiqueta_es":"Fecha y hora","etiqueta_en":"Date and time","tipo":"datetime","requerido":false},{"clave":"indicaciones","etiqueta_es":"Indicaciones","etiqueta_en":"Directions","tipo":"textarea","requerido":false,"max":2000}]'::jsonb, 110, 'migration', 'migration'),
  ('documento', 'Documento', 'Document',
   'Consentimientos, autorizaciones y documentos para firma.',
   'Consents, authorizations and documents for signature.',
   'signature', '#475569',
   '[{"clave":"documento","etiqueta_es":"Documento o consentimiento","etiqueta_en":"Document or consent","tipo":"text","requerido":true,"max":180},{"clave":"requiere_firma","etiqueta_es":"Requiere firma","etiqueta_en":"Signature required","tipo":"boolean","requerido":false},{"clave":"indicaciones","etiqueta_es":"Indicaciones","etiqueta_en":"Directions","tipo":"textarea","requerido":false,"max":2000}]'::jsonb, 120, 'migration', 'migration'),
  ('remision', 'Remisión', 'Referral',
   'Derivación a otra veterinaria o especialista.',
   'Referral to another clinic or specialist.',
   'send', '#9333EA',
   '[{"clave":"destino","etiqueta_es":"Veterinaria o institución de destino","etiqueta_en":"Destination clinic or institution","tipo":"text","requerido":true,"max":180},{"clave":"profesional","etiqueta_es":"Profesional de destino","etiqueta_en":"Receiving professional","tipo":"text","requerido":false,"max":160},{"clave":"motivo","etiqueta_es":"Motivo de remisión","etiqueta_en":"Referral reason","tipo":"textarea","requerido":true,"max":2000},{"clave":"urgente","etiqueta_es":"Remisión urgente","etiqueta_en":"Urgent referral","tipo":"boolean","requerido":false}]'::jsonb, 130, 'migration', 'migration'),
  ('cita', 'Cita', 'Appointment',
   'Programa la próxima atención de la mascota.',
   'Schedules the pet''s next visit.',
   'calendar-clock', '#0D9488',
   '[{"clave":"motivo","etiqueta_es":"Motivo de la cita","etiqueta_en":"Appointment reason","tipo":"text","requerido":true,"max":180},{"clave":"programado_para","etiqueta_es":"Fecha y hora","etiqueta_en":"Date and time","tipo":"datetime","requerido":true},{"clave":"duracion_minutos","etiqueta_es":"Duración estimada (minutos)","etiqueta_en":"Estimated duration (minutes)","tipo":"number","requerido":true,"min":5,"max":480},{"clave":"indicaciones","etiqueta_es":"Indicaciones","etiqueta_en":"Directions","tipo":"textarea","requerido":false,"max":2000}]'::jsonb, 140, 'migration', 'migration');

CREATE INDEX tipos_registro_atencion_estado_orden_idx
  ON configuracion.tipos_registro_atencion(estado, orden);
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON configuracion.tipos_registro_atencion
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

ALTER TABLE personas.mascotas
  ADD CONSTRAINT mascotas_id_organizacion_unique
  UNIQUE (id_mascotas, fid_organizaciones);

ALTER TABLE seguridad.usuarios
  ADD CONSTRAINT usuarios_id_organizacion_unique
  UNIQUE (id_usuarios, fid_organizaciones);

CREATE TABLE personas.atenciones (
  id_atenciones uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  fid_mascotas uuid NOT NULL,
  fid_propietarios uuid,
  fid_usuarios_responsable uuid NOT NULL,
  fid_parametros_estado uuid NOT NULL,
  fecha_atencion date NOT NULL,
  llegada_en timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  inicio_en timestamptz(3),
  finalizada_en timestamptz(3),
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT atenciones_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT atenciones_organizacion_fk FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT atenciones_mascota_tenant_fk FOREIGN KEY (fid_mascotas, fid_organizaciones)
    REFERENCES personas.mascotas(id_mascotas, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT atenciones_propietario_tenant_fk FOREIGN KEY (fid_propietarios, fid_organizaciones)
    REFERENCES personas.propietarios(id_propietarios, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT atenciones_responsable_tenant_fk FOREIGN KEY (fid_usuarios_responsable, fid_organizaciones)
    REFERENCES seguridad.usuarios(id_usuarios, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT atenciones_estado_maestro_fk FOREIGN KEY (fid_parametros_estado)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  CONSTRAINT atenciones_id_organizacion_unique UNIQUE (id_atenciones, fid_organizaciones)
);
CREATE INDEX atenciones_organizacion_fecha_idx
  ON personas.atenciones(fid_organizaciones, fecha_atencion, eliminado_en, llegada_en);
CREATE INDEX atenciones_mascota_idx ON personas.atenciones(fid_mascotas);
CREATE INDEX atenciones_propietario_idx ON personas.atenciones(fid_propietarios);
CREATE INDEX atenciones_responsable_idx ON personas.atenciones(fid_usuarios_responsable);
CREATE INDEX atenciones_estado_maestro_idx ON personas.atenciones(fid_parametros_estado);
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON personas.atenciones
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

CREATE TABLE personas.registros_atencion (
  id_registros_atencion uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  fid_atenciones uuid NOT NULL,
  fid_tipos_registro_atencion uuid NOT NULL,
  resumen varchar(160) NOT NULL,
  detalle jsonb NOT NULL,
  fecha_programada date,
  programado_para timestamptz(3),
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT registros_atencion_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT registros_atencion_detalle_check CHECK (jsonb_typeof(detalle) = 'object'),
  CONSTRAINT registros_atencion_organizacion_fk FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT registros_atencion_atencion_tenant_fk FOREIGN KEY (fid_atenciones, fid_organizaciones)
    REFERENCES personas.atenciones(id_atenciones, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT registros_atencion_tipo_fk FOREIGN KEY (fid_tipos_registro_atencion)
    REFERENCES configuracion.tipos_registro_atencion(id_tipos_registro_atencion) ON DELETE RESTRICT
);
CREATE INDEX registros_atencion_atencion_idx
  ON personas.registros_atencion(fid_atenciones, eliminado_en, created_at);
CREATE INDEX registros_atencion_organizacion_idx
  ON personas.registros_atencion(fid_organizaciones, created_at);
CREATE INDEX registros_atencion_tipo_idx
  ON personas.registros_atencion(fid_tipos_registro_atencion);
CREATE INDEX registros_atencion_fecha_programada_idx
  ON personas.registros_atencion(fecha_programada);
CREATE INDEX registros_atencion_programado_para_idx
  ON personas.registros_atencion(programado_para);
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON personas.registros_atencion
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO configuracion.modulos (
  id_modulos, codigo, nombre, descripcion, icono, ruta, fid_modulos_padre,
  orden, estado, created_by, updated_by
)
SELECT gen_random_uuid(), 'clinic.attentions', 'Atenciones',
       'Gestiona las atenciones diarias y el historial clínico acumulable.',
       'stethoscope', '/clinic/attentions', padre.id_modulos, 330, 1,
       'migration', 'migration'
FROM configuracion.modulos padre
WHERE padre.codigo = 'clinic'
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  icono = EXCLUDED.icono,
  ruta = EXCLUDED.ruta,
  fid_modulos_padre = EXCLUDED.fid_modulos_padre,
  orden = EXCLUDED.orden,
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

WITH capacidades(codigo, accion, descripcion) AS (
  VALUES
    ('clinic.attentions.read', 'read', 'Atenciones: Ver'),
    ('clinic.attentions.create', 'create', 'Atenciones: Crear'),
    ('clinic.attentions.update', 'update', 'Atenciones: Actualizar'),
    ('clinic.attentions.delete', 'delete', 'Atenciones: Eliminar')
)
INSERT INTO seguridad.permisos (
  id_permisos, fid_modulos, codigo, accion, descripcion, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), modulo.id_modulos, capacidad.codigo,
       capacidad.accion, capacidad.descripcion, 1, 'migration', 'migration'
FROM capacidades capacidad
JOIN configuracion.modulos modulo ON modulo.codigo = 'clinic.attentions'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos,
  accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion,
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

INSERT INTO configuracion.planes_modulos (
  id_planes_modulos, fid_planes, fid_modulos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), plan.id_planes, modulo.id_modulos, 1,
       'migration', 'migration'
FROM configuracion.planes plan
CROSS JOIN configuracion.modulos modulo
WHERE plan.codigo IN ('BASIC', 'PREMIUM', 'FULL', 'SYSTEM')
  AND modulo.codigo = 'clinic.attentions'
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

INSERT INTO seguridad.roles_permisos (
  id_roles_permisos, fid_roles, fid_permisos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), rol.id_roles, permiso.id_permisos, 1,
       'migration', 'migration'
FROM seguridad.roles rol
CROSS JOIN seguridad.permisos permiso
WHERE rol.codigo IN ('ADMIN', 'SUPERADMIN')
  AND rol.eliminado_en IS NULL
  AND permiso.codigo LIKE 'clinic.attentions.%'
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';
