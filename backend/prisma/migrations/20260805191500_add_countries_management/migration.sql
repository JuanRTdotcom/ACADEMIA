-- 1. Registrar el módulo de países del sistema en superadministrador
INSERT INTO configuracion.modulos (id_modulos, codigo, nombre, icono, ruta, orden, estado)
VALUES (gen_random_uuid(), 'superadmin.countries', 'Países del sistema', 'globe', '/superadmin/countries', 45, 1)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre, icono = EXCLUDED.icono, ruta = EXCLUDED.ruta,
  orden = EXCLUDED.orden, estado = EXCLUDED.estado, updated_at = CURRENT_TIMESTAMP;

-- 2. Registrar los permisos del módulo
INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado)
SELECT gen_random_uuid(), m.id_modulos, 'superadmin.countries.read', 'read', 'Ver países del sistema', 1
FROM configuracion.modulos m WHERE m.codigo = 'superadmin.countries'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion, estado = 1, updated_at = CURRENT_TIMESTAMP;

INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado)
SELECT gen_random_uuid(), m.id_modulos, 'superadmin.countries.status', 'status', 'Cambiar estado de países', 1
FROM configuracion.modulos m WHERE m.codigo = 'superadmin.countries'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion, estado = 1, updated_at = CURRENT_TIMESTAMP;

-- 3. Asignar los permisos al rol de SUPERADMIN
INSERT INTO seguridad.roles_permisos (id_roles_permisos, fid_roles, fid_permisos, estado)
SELECT gen_random_uuid(), r.id_roles, p.id_permisos, 1
FROM seguridad.roles r
CROSS JOIN seguridad.permisos p
WHERE r.codigo = 'SUPERADMIN' AND p.codigo IN ('superadmin.countries.read', 'superadmin.countries.status')
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET estado = 1;
