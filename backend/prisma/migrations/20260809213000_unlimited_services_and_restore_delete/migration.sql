ALTER TABLE nucleo.servicios_veterinaria
  ADD COLUMN IF NOT EXISTS eliminado_en timestamptz(3),
  ADD COLUMN IF NOT EXISTS eliminado_por uuid;

CREATE INDEX IF NOT EXISTS servicios_veterinaria_organizacion_eliminado_idx
  ON nucleo.servicios_veterinaria (fid_organizaciones, eliminado_en);

ALTER TABLE nucleo.servicios_veterinaria
  ADD CONSTRAINT servicios_veterinaria_eliminado_estado_check
  CHECK (eliminado_en IS NULL OR estado = 0);

DROP INDEX IF EXISTS nucleo.servicios_veterinaria_nombre_activo_unique;
CREATE UNIQUE INDEX servicios_veterinaria_nombre_activo_unique
  ON nucleo.servicios_veterinaria (fid_organizaciones, upper(btrim(nombre)))
  WHERE estado = 1 AND eliminado_en IS NULL;

UPDATE seguridad.permisos
SET estado = 1,
    descripcion = 'Servicios: Eliminar',
    updated_by = 'migration'
WHERE codigo = 'administrator.services.delete';

INSERT INTO seguridad.roles_permisos (
  id_roles_permisos, fid_roles, fid_permisos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), rol.id_roles, permiso.id_permisos, 1,
       'migration', 'migration'
FROM seguridad.roles rol
JOIN seguridad.permisos permiso
  ON permiso.codigo = 'administrator.services.delete'
WHERE rol.codigo IN ('ADMIN', 'SUPERADMIN')
  AND rol.eliminado_en IS NULL
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET
  estado = 1,
  updated_by = 'migration';
