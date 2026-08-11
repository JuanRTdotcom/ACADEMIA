CREATE TABLE nucleo.vacunas (
  id_vacunas uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  nombre varchar(120) NOT NULL,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT vacunas_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT vacunas_nombre_check CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 120),
  CONSTRAINT vacunas_organizacion_fk FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE CASCADE,
  CONSTRAINT vacunas_id_organizacion_unique UNIQUE (id_vacunas, fid_organizaciones)
);

CREATE INDEX vacunas_organizacion_idx
  ON nucleo.vacunas(fid_organizaciones, eliminado_en, estado, nombre);
CREATE UNIQUE INDEX vacunas_nombre_activo_unique
  ON nucleo.vacunas(fid_organizaciones, upper(btrim(nombre)))
  WHERE eliminado_en IS NULL;
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON nucleo.vacunas
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO nucleo.vacunas (
  fid_organizaciones, nombre, created_by, updated_by
)
SELECT organizacion.id_organizaciones, vacuna.nombre, 'migration', 'migration'
FROM nucleo.organizaciones organizacion
CROSS JOIN (VALUES
  ('Antirrábica'),
  ('Triple canina'),
  ('Cuádruple canina'),
  ('Quíntuple canina'),
  ('Séxtuple canina'),
  ('Óctuple canina'),
  ('Bordetella'),
  ('Triple felina'),
  ('Cuádruple felina'),
  ('Leucemia felina')
) vacuna(nombre)
WHERE organizacion.estado = 1 AND organizacion.eliminado_en IS NULL;

ALTER TABLE personas.registros_atencion
  ADD COLUMN fid_vacunas uuid,
  ADD CONSTRAINT registros_atencion_vacuna_tenant_fk
    FOREIGN KEY (fid_vacunas, fid_organizaciones)
    REFERENCES nucleo.vacunas(id_vacunas, fid_organizaciones)
    ON DELETE RESTRICT;
CREATE INDEX registros_atencion_vacuna_idx
  ON personas.registros_atencion(fid_vacunas);

UPDATE configuracion.tipos_registro_atencion
SET campos = '[
  {"clave":"fid_vacunas","etiqueta_es":"Vacuna","etiqueta_en":"Vaccine","tipo":"uuid","fuente":"vacunas","requerido":true},
  {"clave":"laboratorio","etiqueta_es":"Laboratorio","etiqueta_en":"Laboratory","tipo":"text","requerido":false,"max":120},
  {"clave":"lote","etiqueta_es":"Lote de la vacuna","etiqueta_en":"Vaccine batch","tipo":"text","requerido":false,"max":80},
  {"clave":"observaciones","etiqueta_es":"Observaciones","etiqueta_en":"Notes","tipo":"textarea","requerido":false,"max":2000},
  {"clave":"fecha_programada","etiqueta_es":"Próxima vacuna","etiqueta_en":"Next vaccination","tipo":"date","requerido":false}
]'::jsonb,
    updated_by = 'migration'
WHERE codigo = 'vacunacion';

UPDATE configuracion.modulos SET orden = 230, updated_by = 'migration'
WHERE codigo = 'administrator.users';

INSERT INTO configuracion.modulos (
  id_modulos, codigo, nombre, descripcion, icono, ruta, orden, estado,
  created_by, updated_by
)
VALUES (
  gen_random_uuid(), 'administrator.vaccines', 'Vacunas',
  'Administra las vacunas disponibles durante una atención veterinaria.',
  'syringe', '/administrator/vaccines', 225, 1,
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
    ('administrator.vaccines.read', 'read', 'Vacunas: Ver'),
    ('administrator.vaccines.create', 'create', 'Vacunas: Crear'),
    ('administrator.vaccines.update', 'update', 'Vacunas: Actualizar'),
    ('administrator.vaccines.delete', 'delete', 'Vacunas: Eliminar')
)
INSERT INTO seguridad.permisos (
  id_permisos, fid_modulos, codigo, accion, descripcion, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), modulo.id_modulos, capacidad.codigo,
       capacidad.accion, capacidad.descripcion, 1, 'migration', 'migration'
FROM capacidades capacidad
JOIN configuracion.modulos modulo ON modulo.codigo = 'administrator.vaccines'
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
JOIN configuracion.modulos modulo ON modulo.codigo = 'administrator.vaccines'
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
  AND permiso.codigo LIKE 'administrator.vaccines.%'
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';
