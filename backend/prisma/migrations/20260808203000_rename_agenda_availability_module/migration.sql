UPDATE configuracion.modulos
SET nombre = 'Agenda y disponibilidad', updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'administrator.company.agenda';
