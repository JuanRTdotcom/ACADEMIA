-- 1. Registrar el módulo de control de suscripciones en superadmin
INSERT INTO configuracion.modulos (id_modulos, codigo, nombre, icono, ruta, orden, estado)
VALUES (gen_random_uuid(), 'superadmin.subscriptions', 'Control de Suscripciones', 'credit-card', '/superadmin/subscriptions', 46, 1)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre, icono = EXCLUDED.icono, ruta = EXCLUDED.ruta,
  orden = EXCLUDED.orden, estado = EXCLUDED.estado, updated_at = CURRENT_TIMESTAMP;

-- 2. Registrar permisos del módulo de suscripciones (superadmin)
INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado)
SELECT gen_random_uuid(), m.id_modulos, 'superadmin.subscriptions.read', 'read', 'Ver historial global de suscripciones y renovaciones', 1
FROM configuracion.modulos m WHERE m.codigo = 'superadmin.subscriptions'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion, estado = 1, updated_at = CURRENT_TIMESTAMP;

-- 3. Asignar el permiso a SUPERADMIN
INSERT INTO seguridad.roles_permisos (id_roles_permisos, fid_roles, fid_permisos, estado)
SELECT gen_random_uuid(), r.id_roles, p.id_permisos, 1
FROM seguridad.roles r
CROSS JOIN seguridad.permisos p
WHERE r.codigo = 'SUPERADMIN'
  AND p.codigo = 'superadmin.subscriptions.read'
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET estado = 1;

-- 4. Registrar el módulo de suscripción en el área de administrador de empresa
INSERT INTO configuracion.modulos (id_modulos, codigo, nombre, icono, ruta, orden, estado)
VALUES (gen_random_uuid(), 'administrator.company.subscription', 'Suscripción', 'credit-card', '/administrator/company/subscription', 80, 1)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre, icono = EXCLUDED.icono, ruta = EXCLUDED.ruta,
  orden = EXCLUDED.orden, estado = EXCLUDED.estado, updated_at = CURRENT_TIMESTAMP;

-- 5. Registrar permisos del módulo de suscripción (admin empresa)
INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado)
SELECT gen_random_uuid(), m.id_modulos, 'administrator.company.subscription.read', 'read', 'Ver suscripción y pagos de la empresa', 1
FROM configuracion.modulos m WHERE m.codigo = 'administrator.company.subscription'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion, estado = 1, updated_at = CURRENT_TIMESTAMP;

-- 6. Asignar permisos al rol SUPERADMIN (que tiene todo)
INSERT INTO seguridad.roles_permisos (id_roles_permisos, fid_roles, fid_permisos, estado)
SELECT gen_random_uuid(), r.id_roles, p.id_permisos, 1
FROM seguridad.roles r
CROSS JOIN seguridad.permisos p
WHERE r.codigo = 'SUPERADMIN'
  AND p.codigo = 'administrator.company.subscription.read'
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET estado = 1;

-- 7. Asignar permiso al rol ADMIN (administradores de empresa)
INSERT INTO seguridad.roles_permisos (id_roles_permisos, fid_roles, fid_permisos, estado)
SELECT gen_random_uuid(), r.id_roles, p.id_permisos, 1
FROM seguridad.roles r
CROSS JOIN seguridad.permisos p
WHERE r.codigo = 'ADMIN'
  AND p.codigo = 'administrator.company.subscription.read'
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET estado = 1;

-- 8. Vincular módulo administrator.company.subscription a TODOS los planes
-- Los UUIDs correctos de los planes son los v4 corregidos:
--   BASIC   = 40000000-0000-4000-8000-000000000001
--   PREMIUM = 40000000-0000-4000-8000-000000000002
--   FULL    = 40000000-0000-4000-8000-000000000003

INSERT INTO configuracion.planes_modulos (id_planes_modulos, fid_planes, fid_modulos, estado)
SELECT gen_random_uuid(), '40000000-0000-4000-8000-000000000001', id_modulos, 1
FROM configuracion.modulos WHERE codigo = 'administrator.company.subscription'
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET estado = 1;

INSERT INTO configuracion.planes_modulos (id_planes_modulos, fid_planes, fid_modulos, estado)
SELECT gen_random_uuid(), '40000000-0000-4000-8000-000000000002', id_modulos, 1
FROM configuracion.modulos WHERE codigo = 'administrator.company.subscription'
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET estado = 1;

INSERT INTO configuracion.planes_modulos (id_planes_modulos, fid_planes, fid_modulos, estado)
SELECT gen_random_uuid(), '40000000-0000-4000-8000-000000000003', id_modulos, 1
FROM configuracion.modulos WHERE codigo = 'administrator.company.subscription'
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET estado = 1;
