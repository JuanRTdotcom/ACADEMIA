-- El catálogo usa estado reversible; ya no existe una operación de eliminación.
UPDATE seguridad.usuarios_permisos
SET estado = 0, updated_by = 'migration'
WHERE fid_permisos = (
  SELECT id_permisos
  FROM seguridad.permisos
  WHERE codigo = 'administrator.services.delete'
);

UPDATE seguridad.roles_permisos
SET estado = 0, updated_by = 'migration'
WHERE fid_permisos = (
  SELECT id_permisos
  FROM seguridad.permisos
  WHERE codigo = 'administrator.services.delete'
);

UPDATE seguridad.permisos
SET estado = 0, updated_by = 'migration'
WHERE codigo = 'administrator.services.delete';
