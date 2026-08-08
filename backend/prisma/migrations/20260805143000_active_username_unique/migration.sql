-- La baja lógica conserva historial, pero no debe reservar el nombre de usuario.
-- Solo una cuenta vigente puede usar el mismo usuario dentro de una empresa.
DROP INDEX IF EXISTS seguridad.usuarios_fid_organizaciones_usuario_key;

CREATE UNIQUE INDEX usuarios_fid_organizaciones_usuario_activo_key
  ON seguridad.usuarios (fid_organizaciones, UPPER(usuario))
  WHERE eliminado_en IS NULL;
