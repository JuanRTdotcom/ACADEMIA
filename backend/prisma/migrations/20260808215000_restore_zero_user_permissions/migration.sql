-- Repara las cuentas creadas por el formulario global durante la transición:
-- recibieron roles, pero el payload todavía enviaba cero permisos directos.
-- Solo afecta usuarios que no tienen ninguna asignación directa activa.
INSERT INTO seguridad.usuarios_permisos (
  id_usuarios_permisos,
  fid_usuarios,
  fid_permisos,
  estado,
  created_by,
  updated_by
)
SELECT
  gen_random_uuid(),
  u.id_usuarios,
  rp.fid_permisos,
  1,
  'migration',
  'migration'
FROM seguridad.usuarios u
JOIN nucleo.organizaciones o
  ON o.id_organizaciones = u.fid_organizaciones
JOIN seguridad.usuarios_roles ur
  ON ur.fid_usuarios = u.id_usuarios AND ur.estado = 1
JOIN seguridad.roles r
  ON r.id_roles = ur.fid_roles AND r.estado = 1 AND r.eliminado_en IS NULL
JOIN seguridad.roles_permisos rp
  ON rp.fid_roles = r.id_roles AND rp.estado = 1
JOIN seguridad.permisos p
  ON p.id_permisos = rp.fid_permisos AND p.estado = 1
JOIN configuracion.modulos m
  ON m.id_modulos = p.fid_modulos AND m.estado = 1
JOIN configuracion.planes_modulos pm
  ON pm.fid_planes = o.fid_planes AND pm.fid_modulos = m.id_modulos AND pm.estado = 1
WHERE u.estado = 1
  AND u.eliminado_en IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM seguridad.usuarios_permisos up
    WHERE up.fid_usuarios = u.id_usuarios AND up.estado = 1
  )
ON CONFLICT (fid_usuarios, fid_permisos)
DO UPDATE SET estado = 1, updated_by = 'migration';
