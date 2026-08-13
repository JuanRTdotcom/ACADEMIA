UPDATE configuracion.tipos_registro_atencion
SET permite_registro_raiz = false,
    requiere_registro_origen = false,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo IN ('documento', 'cita');
