UPDATE configuracion.modulos
SET ruta = '/administrator/branches',
    descripcion = 'Administra las sedes disponibles de la veterinaria.',
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'administrator.company.branches';
