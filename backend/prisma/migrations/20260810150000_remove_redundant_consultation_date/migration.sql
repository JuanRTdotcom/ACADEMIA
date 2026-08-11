UPDATE configuracion.tipos_registro_atencion
SET campos = campos - 0,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'consulta'
  AND campos->0->>'clave' = 'fecha_consulta';
