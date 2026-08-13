UPDATE configuracion.tipos_registro_atencion tipo
SET campos = (
      SELECT jsonb_agg(
        CASE elemento->>'clave'
          WHEN 'fecha_ingreso' THEN elemento || '{"tipo":"date","etiqueta_es":"Fecha de ingreso","etiqueta_en":"Check-in date"}'::jsonb
          WHEN 'fecha_salida' THEN elemento || '{"tipo":"date","etiqueta_es":"Fecha de salida","etiqueta_en":"Check-out date"}'::jsonb
          ELSE elemento
        END
        ORDER BY posicion
      )
      FROM jsonb_array_elements(tipo.campos) WITH ORDINALITY AS campo(elemento, posicion)
    ),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'guarderia';
