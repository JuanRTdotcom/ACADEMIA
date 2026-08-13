UPDATE configuracion.tipos_registro_atencion
SET icono = 'truck',
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'remision';
