ALTER TABLE configuracion.tipos_registro_atencion
  ADD COLUMN acepta_adjuntos boolean NOT NULL DEFAULT false;

UPDATE configuracion.tipos_registro_atencion
SET acepta_adjuntos = true,
    campos = '[
      {"clave":"fecha_consulta","etiqueta_es":"Fecha de consulta","etiqueta_en":"Consultation date","tipo":"date","requerido":true},
      {"clave":"fid_motivos_consulta","etiqueta_es":"Motivo de consulta","etiqueta_en":"Reason for consultation","tipo":"uuid","fuente":"motivos_consulta","requerido":true},
      {"clave":"subjetivo","etiqueta_es":"Subjetivo (Anamnesis)","etiqueta_en":"Subjective (History)","tipo":"textarea","requerido":false,"max":8000},
      {"clave":"objetivo","etiqueta_es":"Objetivo (Detalles del examen)","etiqueta_en":"Objective (Examination details)","tipo":"textarea","requerido":false,"max":8000},
      {"clave":"interpretacion","etiqueta_es":"Interpretación (Diagnóstico presuntivo/final)","etiqueta_en":"Assessment (Presumptive/final diagnosis)","tipo":"textarea","requerido":false,"max":8000},
      {"clave":"plan_terapeutico","etiqueta_es":"Plan terapéutico","etiqueta_en":"Therapeutic plan","tipo":"textarea","requerido":false,"max":8000},
      {"clave":"plan_diagnostico","etiqueta_es":"Plan diagnóstico","etiqueta_en":"Diagnostic plan","tipo":"textarea","requerido":false,"max":8000},
      {"clave":"fecha_programada","etiqueta_es":"Próximo control","etiqueta_en":"Next follow-up","tipo":"date","requerido":false}
    ]'::jsonb,
    updated_by = 'migration'
WHERE codigo = 'consulta';

CREATE TABLE nucleo.motivos_consulta (
  id_motivos_consulta uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  nombre varchar(120) NOT NULL,
  descripcion varchar(500),
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT motivos_consulta_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT motivos_consulta_nombre_check CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 120),
  CONSTRAINT motivos_consulta_descripcion_check CHECK (descripcion IS NULL OR char_length(descripcion) <= 500),
  CONSTRAINT motivos_consulta_organizacion_fk FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE CASCADE,
  CONSTRAINT motivos_consulta_id_organizacion_unique UNIQUE (id_motivos_consulta, fid_organizaciones)
);
CREATE INDEX motivos_consulta_organizacion_idx
  ON nucleo.motivos_consulta(fid_organizaciones, eliminado_en, estado, nombre);
CREATE UNIQUE INDEX motivos_consulta_nombre_activo_unique
  ON nucleo.motivos_consulta(fid_organizaciones, upper(btrim(nombre)))
  WHERE eliminado_en IS NULL;
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON nucleo.motivos_consulta
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO nucleo.motivos_consulta (
  fid_organizaciones, nombre, descripcion, created_by, updated_by
)
SELECT organizacion.id_organizaciones, motivo.nombre, motivo.descripcion,
       'migration', 'migration'
FROM nucleo.organizaciones organizacion
CROSS JOIN (VALUES
  ('Consulta general', 'Evaluación clínica general.'),
  ('Control', 'Seguimiento de una atención o tratamiento previo.'),
  ('Emergencia', 'Atención que requiere evaluación inmediata.'),
  ('Vacunación', 'Evaluación asociada al plan de vacunación.'),
  ('Síntomas digestivos', 'Vómitos, diarrea, inapetencia u otros signos digestivos.'),
  ('Síntomas respiratorios', 'Tos, estornudos o dificultad respiratoria.'),
  ('Problemas dermatológicos', 'Lesiones, picazón, caída de pelo u otros signos cutáneos.'),
  ('Otro', 'Motivo no incluido en las opciones anteriores.')
) motivo(nombre, descripcion)
WHERE organizacion.estado = 1 AND organizacion.eliminado_en IS NULL;

ALTER TABLE personas.registros_atencion
  ADD COLUMN fid_motivos_consulta uuid,
  ADD CONSTRAINT registros_atencion_id_organizacion_unique
    UNIQUE (id_registros_atencion, fid_organizaciones),
  ADD CONSTRAINT registros_atencion_motivo_tenant_fk
    FOREIGN KEY (fid_motivos_consulta, fid_organizaciones)
    REFERENCES nucleo.motivos_consulta(id_motivos_consulta, fid_organizaciones)
    ON DELETE RESTRICT;
CREATE INDEX registros_atencion_motivo_idx
  ON personas.registros_atencion(fid_motivos_consulta);

CREATE TABLE personas.adjuntos_registro_atencion (
  id_adjuntos_registro_atencion uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  fid_registros_atencion uuid NOT NULL,
  clave_objeto varchar(500) NOT NULL UNIQUE,
  nombre_original varchar(180) NOT NULL,
  tipo_mime varchar(80) NOT NULL,
  bytes integer NOT NULL,
  checksum_sha256 char(64) NOT NULL,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT adjuntos_registro_atencion_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT adjuntos_registro_atencion_bytes_check CHECK (bytes > 0),
  CONSTRAINT adjuntos_registro_atencion_checksum_check CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT adjuntos_registro_atencion_organizacion_fk FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT adjuntos_registro_atencion_registro_tenant_fk
    FOREIGN KEY (fid_registros_atencion, fid_organizaciones)
    REFERENCES personas.registros_atencion(id_registros_atencion, fid_organizaciones)
    ON DELETE RESTRICT
);
CREATE INDEX adjuntos_registro_atencion_registro_idx
  ON personas.adjuntos_registro_atencion(fid_registros_atencion, eliminado_en, created_at);
CREATE INDEX adjuntos_registro_atencion_organizacion_idx
  ON personas.adjuntos_registro_atencion(fid_organizaciones, eliminado_en);
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON personas.adjuntos_registro_atencion
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

UPDATE configuracion.modulos SET orden = 230, updated_by = 'migration'
WHERE codigo = 'administrator.users';

INSERT INTO configuracion.modulos (
  id_modulos, codigo, nombre, descripcion, icono, ruta, orden, estado,
  created_by, updated_by
)
VALUES (
  gen_random_uuid(), 'administrator.consultation_reasons', 'Motivos de consulta',
  'Administra los motivos disponibles al registrar una consulta veterinaria.',
  'list-plus', '/administrator/consultation-reasons', 220, 1,
  'migration', 'migration'
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  icono = EXCLUDED.icono,
  ruta = EXCLUDED.ruta,
  fid_modulos_padre = NULL,
  orden = EXCLUDED.orden,
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

WITH capacidades(codigo, accion, descripcion) AS (
  VALUES
    ('administrator.consultation_reasons.read', 'read', 'Motivos de consulta: Ver'),
    ('administrator.consultation_reasons.create', 'create', 'Motivos de consulta: Crear'),
    ('administrator.consultation_reasons.update', 'update', 'Motivos de consulta: Actualizar'),
    ('administrator.consultation_reasons.delete', 'delete', 'Motivos de consulta: Eliminar')
)
INSERT INTO seguridad.permisos (
  id_permisos, fid_modulos, codigo, accion, descripcion, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), modulo.id_modulos, capacidad.codigo,
       capacidad.accion, capacidad.descripcion, 1, 'migration', 'migration'
FROM capacidades capacidad
JOIN configuracion.modulos modulo
  ON modulo.codigo = 'administrator.consultation_reasons'
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
JOIN configuracion.modulos modulo
  ON modulo.codigo = 'administrator.consultation_reasons'
WHERE plan.codigo IN ('BASIC', 'PREMIUM', 'FULL', 'SYSTEM')
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
  AND permiso.codigo LIKE 'administrator.consultation_reasons.%'
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';
