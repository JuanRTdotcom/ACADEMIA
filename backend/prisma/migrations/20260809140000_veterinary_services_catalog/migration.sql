-- Consolida el precio heredado dentro del catálogo normalizado de servicios.
UPDATE nucleo.servicios_veterinaria servicio
SET precio = COALESCE(servicio.precio, perfil.precio_consulta),
    updated_by = 'migration'
FROM nucleo.perfil_organizacion perfil
WHERE servicio.fid_organizaciones = perfil.fid_organizaciones
  AND servicio.estado = 1
  AND upper(btrim(servicio.nombre)) = upper('Consulta general')
  AND perfil.precio_consulta IS NOT NULL;

INSERT INTO nucleo.servicios_veterinaria (
  id_servicios_veterinaria, fid_organizaciones, nombre, descripcion, precio,
  estado, created_by, updated_by
)
SELECT gen_random_uuid(), perfil.fid_organizaciones, 'Consulta general', NULL,
       perfil.precio_consulta, 1, 'migration', 'migration'
FROM nucleo.perfil_organizacion perfil
WHERE perfil.precio_consulta IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM nucleo.servicios_veterinaria servicio
    WHERE servicio.fid_organizaciones = perfil.fid_organizaciones
      AND servicio.estado = 1
      AND upper(btrim(servicio.nombre)) = upper('Consulta general')
  );

ALTER TABLE nucleo.perfil_organizacion DROP COLUMN precio_consulta;

ALTER TABLE nucleo.servicios_veterinaria
  DROP CONSTRAINT IF EXISTS servicios_veterinaria_fid_organizaciones_nombre_key,
  ADD CONSTRAINT servicios_veterinaria_nombre_valido_check
    CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 120),
  ADD CONSTRAINT servicios_veterinaria_descripcion_valida_check
    CHECK (descripcion IS NULL OR char_length(descripcion) <= 500),
  ADD CONSTRAINT servicios_veterinaria_precio_valido_check
    CHECK (precio IS NULL OR precio >= 0),
  ADD CONSTRAINT servicios_veterinaria_estado_valido_check
    CHECK (estado IN (0, 1));

CREATE UNIQUE INDEX servicios_veterinaria_nombre_activo_unique
  ON nucleo.servicios_veterinaria (fid_organizaciones, upper(btrim(nombre)))
  WHERE estado = 1;

DROP TRIGGER IF EXISTS establecer_updated_at ON nucleo.servicios_veterinaria;
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON nucleo.servicios_veterinaria
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

-- Servicios es un módulo raíz independiente de la configuración Veterinaria.
UPDATE configuracion.modulos
SET orden = 220, updated_by = 'migration'
WHERE codigo = 'administrator.users';

INSERT INTO configuracion.modulos (
  id_modulos, codigo, nombre, descripcion, icono, ruta, orden, estado,
  created_by, updated_by
)
VALUES (
  gen_random_uuid(), 'administrator.services', 'Servicios',
  'Administra el catálogo y los precios de los servicios ofrecidos por la veterinaria.',
  'clipboard-check', '/administrator/services', 210, 1, 'migration', 'migration'
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  icono = EXCLUDED.icono,
  ruta = EXCLUDED.ruta,
  fid_modulos_padre = NULL,
  orden = EXCLUDED.orden,
  estado = 1,
  updated_by = 'migration';

WITH capacidades(codigo, accion, descripcion) AS (
  VALUES
    ('administrator.services.read', 'read', 'Servicios: Ver'),
    ('administrator.services.create', 'create', 'Servicios: Crear'),
    ('administrator.services.update', 'update', 'Servicios: Actualizar'),
    ('administrator.services.delete', 'delete', 'Servicios: Eliminar')
)
INSERT INTO seguridad.permisos (
  id_permisos, fid_modulos, codigo, accion, descripcion, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), modulo.id_modulos, capacidad.codigo,
       capacidad.accion, capacidad.descripcion, 1, 'migration', 'migration'
FROM capacidades capacidad
JOIN configuracion.modulos modulo ON modulo.codigo = 'administrator.services'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos,
  accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion,
  estado = 1,
  updated_by = 'migration';

INSERT INTO configuracion.planes_modulos (
  id_planes_modulos, fid_planes, fid_modulos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), plan.id_planes, modulo.id_modulos, 1,
       'migration', 'migration'
FROM configuracion.planes plan
JOIN configuracion.modulos modulo ON modulo.codigo = 'administrator.services'
WHERE plan.codigo IN ('BASIC', 'PREMIUM', 'FULL', 'SYSTEM')
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET
  estado = 1,
  updated_by = 'migration';

INSERT INTO seguridad.roles_permisos (
  id_roles_permisos, fid_roles, fid_permisos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), rol.id_roles, permiso.id_permisos, 1,
       'migration', 'migration'
FROM seguridad.roles rol
CROSS JOIN seguridad.permisos permiso
WHERE rol.codigo IN ('ADMIN', 'SUPERADMIN')
  AND permiso.codigo LIKE 'administrator.services.%'
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET
  estado = 1,
  updated_by = 'migration';
