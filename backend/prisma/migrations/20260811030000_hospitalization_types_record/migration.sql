CREATE TABLE nucleo.tipos_hospitalizacion (
  id_tipos_hospitalizacion uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  nombre varchar(120) NOT NULL,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT tipos_hospitalizacion_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT tipos_hospitalizacion_nombre_check CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 120),
  CONSTRAINT tipos_hospitalizacion_organizacion_fk FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE CASCADE,
  CONSTRAINT tipos_hospitalizacion_id_organizacion_unique
    UNIQUE (id_tipos_hospitalizacion, fid_organizaciones)
);

CREATE INDEX tipos_hospitalizacion_organizacion_idx
  ON nucleo.tipos_hospitalizacion(fid_organizaciones, eliminado_en, estado, nombre);
CREATE UNIQUE INDEX tipos_hospitalizacion_nombre_activo_unique
  ON nucleo.tipos_hospitalizacion(fid_organizaciones, upper(btrim(nombre)))
  WHERE eliminado_en IS NULL;
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON nucleo.tipos_hospitalizacion
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO nucleo.tipos_hospitalizacion (
  fid_organizaciones, nombre, created_by, updated_by
)
SELECT organizacion.id_organizaciones, tipo.nombre, 'migration', 'migration'
FROM nucleo.organizaciones organizacion
CROSS JOIN (VALUES ('Hospitalización'), ('Ambulatorio')) tipo(nombre)
WHERE organizacion.estado = 1 AND organizacion.eliminado_en IS NULL;

WITH motivos(codigo, etiqueta_es, etiqueta_en, orden) AS (
  VALUES
    ('alta_recuperacion', 'Alta / recuperación', 'Discharge / recovery', 10),
    ('tratamiento_casa', 'Tratamiento en casa', 'Home treatment', 20),
    ('traslado', 'Traslado', 'Transfer', 30),
    ('voluntad_propietario', 'Voluntad del propietario', 'Owner decision', 40),
    ('administrativa', 'Administrativa', 'Administrative', 50),
    ('fallecimiento', 'Fallecimiento', 'Death', 60),
    ('eutanasia', 'Eutanasia', 'Euthanasia', 70)
)
INSERT INTO configuracion.parametros (
  id_parametros, codigo_grupo, codigo, etiqueta, orden, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), 'motivos_salida_hospitalizacion', codigo,
       etiqueta_es, orden, 1, 'migration', 'migration'
FROM motivos
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  orden = EXCLUDED.orden,
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

WITH motivos(codigo, etiqueta_es, etiqueta_en) AS (
  VALUES
    ('alta_recuperacion', 'Alta / recuperación', 'Discharge / recovery'),
    ('tratamiento_casa', 'Tratamiento en casa', 'Home treatment'),
    ('traslado', 'Traslado', 'Transfer'),
    ('voluntad_propietario', 'Voluntad del propietario', 'Owner decision'),
    ('administrativa', 'Administrativa', 'Administrative'),
    ('fallecimiento', 'Fallecimiento', 'Death'),
    ('eutanasia', 'Eutanasia', 'Euthanasia')
), traducciones AS (
  SELECT parametro.id_parametros, idioma.codigo_idioma, idioma.etiqueta
  FROM motivos
  JOIN configuracion.parametros parametro
    ON parametro.codigo_grupo = 'motivos_salida_hospitalizacion'
   AND parametro.codigo = motivos.codigo
  CROSS JOIN LATERAL (
    VALUES ('es', motivos.etiqueta_es), ('en', motivos.etiqueta_en)
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

ALTER TABLE personas.registros_atencion
  ADD COLUMN fid_tipos_hospitalizacion uuid,
  ADD COLUMN fid_parametros_motivo_salida_hospitalizacion uuid,
  ADD CONSTRAINT registros_atencion_tipo_hospitalizacion_tenant_fk
    FOREIGN KEY (fid_tipos_hospitalizacion, fid_organizaciones)
    REFERENCES nucleo.tipos_hospitalizacion(id_tipos_hospitalizacion, fid_organizaciones)
    ON DELETE RESTRICT,
  ADD CONSTRAINT registros_atencion_motivo_salida_hospitalizacion_fk
    FOREIGN KEY (fid_parametros_motivo_salida_hospitalizacion)
    REFERENCES configuracion.parametros(id_parametros)
    ON DELETE RESTRICT;

CREATE INDEX registros_atencion_tipo_hospitalizacion_idx
  ON personas.registros_atencion(fid_tipos_hospitalizacion);
CREATE INDEX registros_atencion_motivo_salida_hospitalizacion_idx
  ON personas.registros_atencion(fid_parametros_motivo_salida_hospitalizacion);

UPDATE configuracion.tipos_registro_atencion
SET campos = '[
  {"clave":"fid_tipos_hospitalizacion","etiqueta_es":"Tipo","etiqueta_en":"Type","tipo":"uuid","fuente":"tipos_hospitalizacion","requerido":true},
  {"clave":"fecha_ingreso","etiqueta_es":"Fecha de ingreso","etiqueta_en":"Admission date","tipo":"date","requerido":true},
  {"clave":"razon_ingreso","etiqueta_es":"Razón de ingreso","etiqueta_en":"Admission reason","tipo":"textarea","requerido":true,"max":2000},
  {"clave":"fid_parametros_motivo_salida_hospitalizacion","etiqueta_es":"Motivo de salida","etiqueta_en":"Discharge reason","tipo":"uuid","fuente":"motivos_salida_hospitalizacion","requerido":false},
  {"clave":"fecha_salida","etiqueta_es":"Fecha de salida","etiqueta_en":"Discharge date","tipo":"date","requerido":false},
  {"clave":"observaciones","etiqueta_es":"Observaciones","etiqueta_en":"Notes","tipo":"textarea","requerido":false,"max":3000}
]'::jsonb,
    acepta_adjuntos = false,
    max_adjuntos = NULL,
    updated_by = 'migration'
WHERE codigo = 'hospitalizacion_ambulatorio';

UPDATE configuracion.modulos SET orden = 240, updated_by = 'migration'
WHERE codigo = 'administrator.users';

INSERT INTO configuracion.modulos (
  id_modulos, codigo, nombre, descripcion, icono, ruta, orden, estado,
  created_by, updated_by
)
VALUES (
  gen_random_uuid(), 'administrator.hospitalization_types',
  'Tipos de hospitalización',
  'Administra los tipos disponibles para hospitalización y manejo ambulatorio.',
  'hospital', '/administrator/hospitalization-types', 230, 1,
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
    ('administrator.hospitalization_types.read', 'read', 'Tipos de hospitalización: Ver'),
    ('administrator.hospitalization_types.create', 'create', 'Tipos de hospitalización: Crear'),
    ('administrator.hospitalization_types.update', 'update', 'Tipos de hospitalización: Actualizar'),
    ('administrator.hospitalization_types.delete', 'delete', 'Tipos de hospitalización: Eliminar')
)
INSERT INTO seguridad.permisos (
  id_permisos, fid_modulos, codigo, accion, descripcion, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), modulo.id_modulos, capacidad.codigo,
       capacidad.accion, capacidad.descripcion, 1, 'migration', 'migration'
FROM capacidades capacidad
JOIN configuracion.modulos modulo
  ON modulo.codigo = 'administrator.hospitalization_types'
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
  ON modulo.codigo = 'administrator.hospitalization_types'
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
  AND permiso.codigo LIKE 'administrator.hospitalization_types.%'
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';
