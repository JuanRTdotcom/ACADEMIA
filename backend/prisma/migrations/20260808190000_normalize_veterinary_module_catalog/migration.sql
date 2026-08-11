-- El catálogo visible debe representar exactamente la navegación vigente.
-- Los códigos técnicos no cambian: son contratos de autorización y auditoría.
UPDATE seguridad.roles_permisos rp
SET estado = 0
FROM seguridad.permisos p
WHERE rp.fid_permisos = p.id_permisos
  AND p.fid_modulos IN (SELECT id_modulos FROM configuracion.modulos WHERE codigo IN ('profile', 'companies', 'plans', 'roles', 'users', 'subscriptions'));

UPDATE configuracion.planes_modulos pm
SET estado = 0
WHERE pm.fid_modulos IN (SELECT id_modulos FROM configuracion.modulos WHERE codigo IN ('profile', 'companies', 'plans', 'roles', 'users', 'subscriptions'));

UPDATE seguridad.permisos
SET estado = 0, updated_at = CURRENT_TIMESTAMP
WHERE fid_modulos IN (SELECT id_modulos FROM configuracion.modulos WHERE codigo IN ('profile', 'companies', 'plans', 'roles', 'users', 'subscriptions'));

UPDATE configuracion.modulos
SET estado = 0, updated_at = CURRENT_TIMESTAMP
WHERE codigo IN ('profile', 'companies', 'plans', 'roles', 'users', 'subscriptions');

INSERT INTO configuracion.modulos (id_modulos, codigo, nombre, icono, ruta, orden, estado)
VALUES
  (gen_random_uuid(), 'dashboard', 'Dashboard', 'grid', '/dashboard', 10, 1),
  (gen_random_uuid(), 'superadmin.companies', 'Veterinarias', 'building-2', '/superadmin/companies', 20, 1),
  (gen_random_uuid(), 'superadmin.users', 'Usuarios del sistema', 'user-cog', '/superadmin/users', 30, 1),
  (gen_random_uuid(), 'superadmin.roles', 'Roles', 'shield-check', '/superadmin/roles', 40, 1),
  (gen_random_uuid(), 'superadmin.countries', 'Países', 'globe', '/superadmin/countries', 50, 1),
  (gen_random_uuid(), 'superadmin.plans', 'Planes de suscripción', 'package', '/superadmin/plans', 60, 1),
  (gen_random_uuid(), 'superadmin.subscriptions', 'Control de suscripciones', 'credit-card', '/superadmin/subscriptions', 70, 1),
  (gen_random_uuid(), 'administrator.company.general', 'Veterinaria', 'building-2', '/administrator/company/general', 100, 1),
  (gen_random_uuid(), 'administrator.company.contact', 'Ubicación y contacto', 'map-pin', '/administrator/company/contact', 110, 1),
  (gen_random_uuid(), 'administrator.company.services', 'Servicios', 'heart', '/administrator/company/services', 120, 1),
  (gen_random_uuid(), 'administrator.company.agenda', 'Agenda', 'calendar-clock', '/administrator/company/agenda', 130, 1),
  (gen_random_uuid(), 'administrator.company.fiscal', 'Perfil fiscal', 'scroll-text', '/administrator/company/fiscal', 140, 1),
  (gen_random_uuid(), 'administrator.company.digital_presence', 'Presencia digital', 'share-2', '/administrator/company/digital-presence', 150, 1),
  (gen_random_uuid(), 'administrator.company.identity', 'Identidad visual', 'image', '/administrator/company/identity', 160, 1),
  (gen_random_uuid(), 'administrator.company.login_branding', 'Inicio de sesión', 'log-in', '/administrator/company/login-branding', 170, 1),
  (gen_random_uuid(), 'administrator.company.communications', 'Comunicaciones', 'mail', '/administrator/company/communications', 180, 1),
  (gen_random_uuid(), 'administrator.company.region', 'Internacionalización', 'globe', '/administrator/company/region', 190, 1),
  (gen_random_uuid(), 'administrator.company.subscription', 'Suscripción', 'credit-card', '/administrator/company/subscription', 200, 1),
  (gen_random_uuid(), 'administrator.users', 'Usuarios', 'users', '/administrator/users', 210, 1)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre, icono = EXCLUDED.icono, ruta = EXCLUDED.ruta,
  orden = EXCLUDED.orden, estado = 1, updated_at = CURRENT_TIMESTAMP;

WITH capacidades(codigo, codigo_modulo, accion) AS (
  VALUES
    ('administrator.company.services.read', 'administrator.company.services', 'read'), ('administrator.company.services.update', 'administrator.company.services', 'update'),
    ('administrator.company.agenda.read', 'administrator.company.agenda', 'read'), ('administrator.company.agenda.update', 'administrator.company.agenda', 'update'),
    ('administrator.company.fiscal.read', 'administrator.company.fiscal', 'read'), ('administrator.company.fiscal.update', 'administrator.company.fiscal', 'update')
)
INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado)
SELECT gen_random_uuid(), m.id_modulos, c.codigo, c.accion, c.codigo, 1
FROM capacidades c
JOIN configuracion.modulos m ON m.codigo = c.codigo_modulo
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion, estado = 1,
  updated_at = CURRENT_TIMESTAMP;

UPDATE seguridad.permisos p
SET descripcion = m.nombre || ': ' || CASE p.accion
  WHEN 'read' THEN 'Ver'
  WHEN 'create' THEN 'Crear'
  WHEN 'update' THEN 'Actualizar'
  WHEN 'delete' THEN 'Eliminar'
  WHEN 'status' THEN 'Cambiar estado'
  WHEN 'assign' THEN 'Asignar'
  WHEN 'avatar' THEN 'Actualizar foto'
  WHEN 'verify' THEN 'Verificar'
  WHEN 'export' THEN 'Exportar'
  ELSE p.accion
END,
updated_at = CURRENT_TIMESTAMP
FROM configuracion.modulos m
WHERE p.fid_modulos = m.id_modulos AND p.estado = 1;

-- El plan del sistema y SUPERADMIN siempre ven el catálogo vigente completo.
INSERT INTO configuracion.planes_modulos (id_planes_modulos, fid_planes, fid_modulos, estado)
SELECT gen_random_uuid(), pl.id_planes, m.id_modulos, 1
FROM configuracion.planes pl
CROSS JOIN configuracion.modulos m
WHERE pl.codigo = 'SYSTEM' AND m.estado = 1
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET estado = 1;

INSERT INTO seguridad.roles_permisos (id_roles_permisos, fid_roles, fid_permisos, estado)
SELECT gen_random_uuid(), r.id_roles, p.id_permisos, 1
FROM seguridad.roles r
CROSS JOIN seguridad.permisos p
WHERE r.codigo = 'SUPERADMIN' AND p.estado = 1
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET estado = 1;
