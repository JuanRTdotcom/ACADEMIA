UPDATE configuracion.tipos_registro_atencion tipo
SET campos = (
  SELECT jsonb_agg(
    CASE
      WHEN campo.valor->>'clave' IN ('preanestesico', 'anestesico')
        THEN jsonb_set(campo.valor, '{tipo}', '"text"'::jsonb)
      ELSE campo.valor
    END
    ORDER BY campo.orden
  )
  FROM jsonb_array_elements(tipo.campos) WITH ORDINALITY AS campo(valor, orden)
),
updated_at = CURRENT_TIMESTAMP,
updated_by = 'migration'
WHERE tipo.codigo = 'cirugia_procedimiento';
