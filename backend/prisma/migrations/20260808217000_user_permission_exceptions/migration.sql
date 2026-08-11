CREATE TYPE seguridad.efecto_permiso_usuario AS ENUM ('permitir', 'denegar');

ALTER TABLE seguridad.usuarios_permisos
  ADD COLUMN efecto seguridad.efecto_permiso_usuario NOT NULL DEFAULT 'permitir';

-- El modelo anterior guardaba una fotografía completa. Primero registra como
-- denegación cada permiso heredado que faltaba en esa fotografía.
INSERT INTO seguridad.usuarios_permisos (
  id_usuarios_permisos, fid_usuarios, fid_permisos, efecto,
  estado, created_by, updated_by
)
SELECT gen_random_uuid(), u.id_usuarios, rp.fid_permisos, 'denegar',
       1, 'migration', 'migration'
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
    WHERE up.fid_usuarios = u.id_usuarios
      AND up.fid_permisos = rp.fid_permisos
      AND up.estado = 1
  )
ON CONFLICT (fid_usuarios, fid_permisos)
DO UPDATE SET efecto = 'denegar', estado = 1, updated_by = 'migration';

-- Las coincidencias con el rol dejan de ser copias y pasan a heredarse.
UPDATE seguridad.usuarios_permisos up
SET estado = 0, updated_by = 'migration'
WHERE up.estado = 1
  AND up.efecto = 'permitir'
  AND EXISTS (
    SELECT 1
    FROM seguridad.usuarios_roles ur
    JOIN seguridad.roles r ON r.id_roles = ur.fid_roles AND r.estado = 1 AND r.eliminado_en IS NULL
    JOIN seguridad.roles_permisos rp ON rp.fid_roles = r.id_roles AND rp.estado = 1
    WHERE ur.fid_usuarios = up.fid_usuarios
      AND ur.estado = 1
      AND rp.fid_permisos = up.fid_permisos
  );

-- Una excepción jamás amplía un módulo fuera del plan del tenant.
UPDATE seguridad.usuarios_permisos up
SET estado = 0, updated_by = 'migration'
FROM seguridad.usuarios u, nucleo.organizaciones o, seguridad.permisos p
WHERE u.id_usuarios = up.fid_usuarios
  AND o.id_organizaciones = u.fid_organizaciones
  AND p.id_permisos = up.fid_permisos
  AND up.estado = 1
  AND NOT EXISTS (
    SELECT 1 FROM configuracion.planes_modulos pm
    WHERE pm.fid_planes = o.fid_planes
      AND pm.fid_modulos = p.fid_modulos
      AND pm.estado = 1
  );
