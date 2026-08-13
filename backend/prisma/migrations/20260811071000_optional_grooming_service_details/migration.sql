ALTER TABLE personas.servicios_registro_peluqueria_spa
  ALTER COLUMN fid_usuarios_encargado DROP NOT NULL,
  ALTER COLUMN motivo DROP NOT NULL;

UPDATE configuracion.tipos_registro_atencion
SET campos = jsonb_set(
               jsonb_set(campos, '{0,campos,1,requerido}', 'false'::jsonb),
               '{0,campos,2,requerido}', 'false'::jsonb
             ),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'peluqueria_spa';
