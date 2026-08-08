UPDATE configuracion.acciones_requeridas_maestro
SET
  descripcion = 'Verifica los correos que agregaste para seleccionarlos como correo de mensajes o respaldo.',
  updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'perfil.correos.sin_verificar';
