CREATE TABLE nucleo.estudios_diagnosticos (
  id_estudios_diagnosticos uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  nombre varchar(160) NOT NULL,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT estudios_diagnosticos_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT estudios_diagnosticos_nombre_check CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 160),
  CONSTRAINT estudios_diagnosticos_organizacion_fk FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE CASCADE,
  CONSTRAINT estudios_diagnosticos_id_organizacion_unique
    UNIQUE (id_estudios_diagnosticos, fid_organizaciones)
);

CREATE INDEX estudios_diagnosticos_organizacion_idx
  ON nucleo.estudios_diagnosticos(fid_organizaciones, eliminado_en, estado, created_at DESC);
CREATE UNIQUE INDEX estudios_diagnosticos_nombre_activo_unique
  ON nucleo.estudios_diagnosticos(fid_organizaciones, upper(btrim(nombre)))
  WHERE eliminado_en IS NULL;
CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON nucleo.estudios_diagnosticos
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO nucleo.estudios_diagnosticos (fid_organizaciones, nombre, created_by, updated_by)
SELECT organizacion.id_organizaciones, estudio.nombre, 'migration', 'migration'
FROM nucleo.organizaciones organizacion
CROSS JOIN (VALUES
  ('Radiografía'), ('Ecografía'), ('Ecocardiografía'), ('Electrocardiografía'),
  ('Tomografía computarizada'), ('Resonancia magnética'), ('Endoscopia'),
  ('Fluoroscopia'), ('Radiografía dental'), ('Ecografía Doppler')
) estudio(nombre)
WHERE organizacion.estado = 1 AND organizacion.eliminado_en IS NULL;

WITH opciones(codigo, etiqueta_es, etiqueta_en, orden) AS (
  VALUES
    ('si', 'Sí', 'Yes', 10),
    ('no', 'No', 'No', 20),
    ('no_aplica', 'No aplica', 'Not applicable', 30)
)
INSERT INTO configuracion.parametros (
  id_parametros, codigo_grupo, codigo, etiqueta, orden, estado, created_by, updated_by
)
SELECT gen_random_uuid(), 'sedacion_imagen_diagnostica', codigo, etiqueta_es, orden, 1,
       'migration', 'migration'
FROM opciones
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta, orden = EXCLUDED.orden, estado = 1,
  updated_at = CURRENT_TIMESTAMP, updated_by = 'migration';

WITH opciones(codigo, etiqueta_es, etiqueta_en) AS (
  VALUES ('si', 'Sí', 'Yes'), ('no', 'No', 'No'), ('no_aplica', 'No aplica', 'Not applicable')
), traducciones AS (
  SELECT parametro.id_parametros, idioma.codigo_idioma, idioma.etiqueta
  FROM opciones
  JOIN configuracion.parametros parametro
    ON parametro.codigo_grupo = 'sedacion_imagen_diagnostica'
   AND parametro.codigo = opciones.codigo
  CROSS JOIN LATERAL (VALUES ('es', opciones.etiqueta_es), ('en', opciones.etiqueta_en)) idioma(codigo_idioma, etiqueta)
)
INSERT INTO configuracion.parametros_traducciones (
  id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta, created_by, updated_by
)
SELECT gen_random_uuid(), id_parametros, codigo_idioma, etiqueta, 'migration', 'migration'
FROM traducciones
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta, updated_at = CURRENT_TIMESTAMP, updated_by = 'migration';

ALTER TABLE personas.registros_atencion
  ADD COLUMN fid_estudios_diagnosticos uuid,
  ADD COLUMN fid_parametros_sedacion_imagen uuid,
  ADD CONSTRAINT registros_atencion_estudio_diagnostico_tenant_fk
    FOREIGN KEY (fid_estudios_diagnosticos, fid_organizaciones)
    REFERENCES nucleo.estudios_diagnosticos(id_estudios_diagnosticos, fid_organizaciones)
    ON DELETE RESTRICT,
  ADD CONSTRAINT registros_atencion_sedacion_imagen_fk
    FOREIGN KEY (fid_parametros_sedacion_imagen)
    REFERENCES configuracion.parametros(id_parametros)
    ON DELETE RESTRICT;

CREATE INDEX registros_atencion_estudio_diagnostico_idx
  ON personas.registros_atencion(fid_estudios_diagnosticos);
CREATE INDEX registros_atencion_sedacion_imagen_idx
  ON personas.registros_atencion(fid_parametros_sedacion_imagen);

UPDATE configuracion.tipos_registro_atencion
SET nombre_es = 'Imágenes diagnósticas',
    nombre_en = 'Diagnostic imaging',
    icono = 'image',
    campos = '[
      {"clave":"fid_estudios_diagnosticos","etiqueta_es":"Estudio diagnóstico","etiqueta_en":"Diagnostic study","tipo":"uuid","fuente":"estudios_diagnosticos","requerido":true},
      {"clave":"fid_parametros_sedacion_imagen","etiqueta_es":"Requiere sedación","etiqueta_en":"Requires sedation","tipo":"uuid","fuente":"sedacion_imagen_diagnostica","requerido":true},
      {"clave":"signos_clinicos","etiqueta_es":"Signos clínicos","etiqueta_en":"Clinical signs","tipo":"text","requerido":false,"max":1000},
      {"clave":"diagnosticos_presuntivos","etiqueta_es":"Diagnósticos presuntivos","etiqueta_en":"Presumptive diagnoses","tipo":"text","requerido":false,"max":1000},
      {"clave":"tipo_estudio","etiqueta_es":"Tipo de estudio","etiqueta_en":"Study type","tipo":"text","requerido":true,"max":180},
      {"clave":"observaciones","etiqueta_es":"Observaciones","etiqueta_en":"Notes","tipo":"textarea","requerido":false,"max":4000}
    ]'::jsonb,
    acepta_adjuntos = true,
    max_adjuntos = 10,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'imagen_diagnostica';

UPDATE configuracion.modulos SET orden = orden + 10, updated_by = 'migration'
WHERE codigo = 'administrator.users' AND orden >= 260;

INSERT INTO configuracion.modulos (
  id_modulos, codigo, nombre, descripcion, icono, ruta, orden, estado, created_by, updated_by
)
VALUES (
  gen_random_uuid(), 'administrator.diagnostic_studies', 'Estudios diagnósticos',
  'Administra los estudios disponibles para imágenes diagnósticas.',
  'image', '/administrator/diagnostic-studies', 260, 1, 'migration', 'migration'
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono,
  ruta=EXCLUDED.ruta, fid_modulos_padre=NULL, orden=EXCLUDED.orden, estado=1,
  updated_at=CURRENT_TIMESTAMP, updated_by='migration';

WITH capacidades(codigo, accion, descripcion) AS (VALUES
  ('administrator.diagnostic_studies.read','read','Estudios diagnósticos: Ver'),
  ('administrator.diagnostic_studies.create','create','Estudios diagnósticos: Crear'),
  ('administrator.diagnostic_studies.update','update','Estudios diagnósticos: Actualizar'),
  ('administrator.diagnostic_studies.delete','delete','Estudios diagnósticos: Eliminar')
)
INSERT INTO seguridad.permisos (id_permisos,fid_modulos,codigo,accion,descripcion,estado,created_by,updated_by)
SELECT gen_random_uuid(),modulo.id_modulos,capacidad.codigo,capacidad.accion,capacidad.descripcion,1,'migration','migration'
FROM capacidades capacidad JOIN configuracion.modulos modulo ON modulo.codigo='administrator.diagnostic_studies'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos=EXCLUDED.fid_modulos,accion=EXCLUDED.accion,descripcion=EXCLUDED.descripcion,
  estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';

INSERT INTO configuracion.planes_modulos (id_planes_modulos,fid_planes,fid_modulos,estado,created_by,updated_by)
SELECT gen_random_uuid(),plan.id_planes,modulo.id_modulos,1,'migration','migration'
FROM configuracion.planes plan JOIN configuracion.modulos modulo ON modulo.codigo='administrator.diagnostic_studies'
WHERE plan.codigo IN ('BASIC','PREMIUM','FULL','SYSTEM')
ON CONFLICT (fid_planes,fid_modulos) DO UPDATE SET estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';

INSERT INTO seguridad.roles_permisos (id_roles_permisos,fid_roles,fid_permisos,estado,created_by,updated_by)
SELECT gen_random_uuid(),rol.id_roles,permiso.id_permisos,1,'migration','migration'
FROM seguridad.roles rol CROSS JOIN seguridad.permisos permiso
WHERE rol.codigo IN ('ADMIN','SUPERADMIN') AND rol.eliminado_en IS NULL
  AND permiso.codigo LIKE 'administrator.diagnostic_studies.%'
ON CONFLICT (fid_roles,fid_permisos) DO UPDATE SET estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';
