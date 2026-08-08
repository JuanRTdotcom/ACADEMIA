-- Los permisos son datos maestros de PostgreSQL. El seed solo los consulta
-- para asignar todos los permisos activos al rol propietario.
INSERT INTO seguridad.permisos
  (id_permisos, codigo, descripcion, estado)
VALUES
  (gen_random_uuid(), 'companies.read', 'Ver empresas', 1),
  (gen_random_uuid(), 'companies.create', 'Crear empresas', 1),
  (gen_random_uuid(), 'companies.update', 'Editar empresas', 1),
  (gen_random_uuid(), 'companies.delete', 'Eliminar empresas', 1),
  (gen_random_uuid(), 'systemUsers.read', 'Ver usuarios del sistema', 1),
  (gen_random_uuid(), 'systemUsers.manage', 'Gestionar usuarios del sistema', 1)
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    estado = EXCLUDED.estado;
