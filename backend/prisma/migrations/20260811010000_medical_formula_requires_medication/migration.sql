UPDATE configuracion.tipos_registro_atencion tipo
SET campos = (
      SELECT jsonb_agg(
        CASE
          WHEN campo.valor->>'clave' = 'medicamentos'
            THEN jsonb_set(campo.valor, '{requerido}', 'true'::jsonb)
          ELSE campo.valor
        END
        ORDER BY campo.orden
      )
      FROM jsonb_array_elements(tipo.campos) WITH ORDINALITY AS campo(valor, orden)
    ),
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE tipo.codigo = 'formula_medica'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(tipo.campos) AS campo(valor)
    WHERE campo.valor->>'clave' = 'medicamentos'
  );
