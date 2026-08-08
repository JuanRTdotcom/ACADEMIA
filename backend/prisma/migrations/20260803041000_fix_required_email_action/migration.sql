UPDATE configuracion.acciones_requeridas_maestro
SET
  codigo = 'perfil.correos.sin_verificar',
  nombre = 'Verificar correos agregados',
  descripcion = 'Verifica tus correos agregados para poder utilizarlos.',
  updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'perfil.correos.externos_insuficientes';

WITH estado_correos AS (
  SELECT
    ar.id_acciones_requeridas,
    COUNT(pc.id_personas_correos)::INTEGER AS correos_sin_verificar
  FROM seguridad.acciones_requeridas ar
  INNER JOIN configuracion.acciones_requeridas_maestro arm
    ON arm.id_acciones_requeridas_maestro = ar.fid_acciones_requeridas_maestro
  INNER JOIN seguridad.usuarios u
    ON u.id_usuarios = ar.fid_usuarios
  LEFT JOIN personas.personas_correos pc
    ON pc.fid_personas = u.fid_personas
    AND pc.fid_organizaciones = ar.fid_organizaciones
    AND pc.estado = 1
    AND pc.verificado_en IS NULL
  WHERE arm.codigo = 'perfil.correos.sin_verificar'
  GROUP BY ar.id_acciones_requeridas
)
UPDATE seguridad.acciones_requeridas ar
SET
  metadatos = jsonb_build_object(
    'correos_sin_verificar',
    ec.correos_sin_verificar
  ),
  estado = CASE WHEN ec.correos_sin_verificar > 0 THEN 1 ELSE 0 END,
  resuelta_en = CASE
    WHEN ec.correos_sin_verificar > 0 THEN NULL
    ELSE CURRENT_TIMESTAMP
  END,
  updated_at = CURRENT_TIMESTAMP
FROM estado_correos ec
WHERE ec.id_acciones_requeridas = ar.id_acciones_requeridas;
