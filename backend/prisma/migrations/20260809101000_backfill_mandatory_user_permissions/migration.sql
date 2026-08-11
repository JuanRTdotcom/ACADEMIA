INSERT INTO seguridad.usuarios_permisos (
  fid_usuarios,
  fid_permisos,
  efecto,
  estado,
  created_at,
  updated_at
)
SELECT
  usuario.id_usuarios,
  permiso.id_permisos,
  'permitir'::seguridad.efecto_permiso_usuario,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM seguridad.usuarios AS usuario
JOIN nucleo.organizaciones AS organizacion
  ON organizacion.id_organizaciones = usuario.fid_organizaciones
JOIN configuracion.planes_modulos AS plan_modulo
  ON plan_modulo.fid_planes = organizacion.fid_planes
 AND plan_modulo.estado = 1
JOIN configuracion.modulos AS modulo
  ON modulo.id_modulos = plan_modulo.fid_modulos
 AND modulo.estado = 1
 AND modulo.acceso_usuario_obligatorio = TRUE
JOIN seguridad.permisos AS permiso
  ON permiso.fid_modulos = modulo.id_modulos
 AND permiso.estado = 1
WHERE usuario.estado = 1
  AND usuario.eliminado_en IS NULL
  AND organizacion.estado = 1
  AND organizacion.eliminado_en IS NULL
ON CONFLICT (fid_usuarios, fid_permisos) DO UPDATE
SET efecto = 'permitir'::seguridad.efecto_permiso_usuario,
    estado = 1,
    updated_at = CURRENT_TIMESTAMP;
