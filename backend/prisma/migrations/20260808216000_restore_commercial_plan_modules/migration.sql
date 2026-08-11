-- La normalización del catálogo desactivó los módulos heredados, pero también
-- dejó sin relaciones activas a los tres planes comerciales. Se restauran sus
-- alcances históricos usando el catálogo vigente.

INSERT INTO configuracion.planes_modulos (
  id_planes_modulos, fid_planes, fid_modulos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), pl.id_planes, m.id_modulos, 1, 'migration', 'migration'
FROM configuracion.planes pl
JOIN configuracion.modulos m ON m.estado = 1
WHERE pl.codigo = 'BASIC'
  AND (
    m.codigo = 'dashboard'
    OR m.codigo LIKE 'profile.%'
    OR m.codigo IN (
      'administrator.company.general',
      'administrator.company.contact',
      'administrator.company.region',
      'administrator.company.identity',
      'administrator.company.subscription'
    )
  )
ON CONFLICT (fid_planes, fid_modulos)
DO UPDATE SET estado = 1, updated_by = 'migration';

INSERT INTO configuracion.planes_modulos (
  id_planes_modulos, fid_planes, fid_modulos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), pl.id_planes, m.id_modulos, 1, 'migration', 'migration'
FROM configuracion.planes pl
JOIN configuracion.modulos m ON m.estado = 1
WHERE pl.codigo = 'PREMIUM'
  AND (
    m.codigo = 'dashboard'
    OR m.codigo LIKE 'profile.%'
    OR m.codigo IN (
      'administrator.company.general',
      'administrator.company.contact',
      'administrator.company.region',
      'administrator.company.identity',
      'administrator.company.digital_presence',
      'administrator.company.login_branding',
      'administrator.company.subscription'
    )
  )
ON CONFLICT (fid_planes, fid_modulos)
DO UPDATE SET estado = 1, updated_by = 'migration';

INSERT INTO configuracion.planes_modulos (
  id_planes_modulos, fid_planes, fid_modulos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), pl.id_planes, m.id_modulos, 1, 'migration', 'migration'
FROM configuracion.planes pl
JOIN configuracion.modulos m ON m.estado = 1
WHERE pl.codigo = 'FULL' AND m.codigo NOT LIKE 'superadmin.%'
ON CONFLICT (fid_planes, fid_modulos)
DO UPDATE SET estado = 1, updated_by = 'migration';

-- Repite la reparación de transición ahora que el plan vuelve a tener módulos.
INSERT INTO seguridad.usuarios_permisos (
  id_usuarios_permisos, fid_usuarios, fid_permisos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), u.id_usuarios, rp.fid_permisos, 1, 'migration', 'migration'
FROM seguridad.usuarios u
JOIN nucleo.organizaciones o ON o.id_organizaciones = u.fid_organizaciones
JOIN seguridad.usuarios_roles ur ON ur.fid_usuarios = u.id_usuarios AND ur.estado = 1
JOIN seguridad.roles r ON r.id_roles = ur.fid_roles AND r.estado = 1 AND r.eliminado_en IS NULL
JOIN seguridad.roles_permisos rp ON rp.fid_roles = r.id_roles AND rp.estado = 1
JOIN seguridad.permisos p ON p.id_permisos = rp.fid_permisos AND p.estado = 1
JOIN configuracion.modulos m ON m.id_modulos = p.fid_modulos AND m.estado = 1
JOIN configuracion.planes_modulos pm
  ON pm.fid_planes = o.fid_planes AND pm.fid_modulos = m.id_modulos AND pm.estado = 1
WHERE u.estado = 1
  AND u.eliminado_en IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM seguridad.usuarios_permisos up
    WHERE up.fid_usuarios = u.id_usuarios AND up.estado = 1
  )
ON CONFLICT (fid_usuarios, fid_permisos)
DO UPDATE SET estado = 1, updated_by = 'migration';
