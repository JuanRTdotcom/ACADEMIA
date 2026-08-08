INSERT INTO eventos.eventos_maestro
  (id_eventos_maestro, codigo, tipo_agregado, nombre, descripcion, version, visible_actividad, estado)
VALUES
  (
    gen_random_uuid(),
    'perfil.datos_personales.actualizados',
    'personas',
    'Datos personales actualizados',
    'El usuario actualizó sus datos personales.',
    1,
    TRUE,
    1
  ),
  (
    gen_random_uuid(),
    'perfil.avatar.actualizado',
    'personas',
    'Avatar actualizado',
    'El usuario cambió su avatar.',
    1,
    TRUE,
    1
  ),
  (
    gen_random_uuid(),
    'perfil.avatar.eliminado',
    'personas',
    'Avatar eliminado',
    'El usuario eliminó su avatar.',
    1,
    TRUE,
    1
  )
ON CONFLICT (codigo, version) DO UPDATE
SET tipo_agregado = EXCLUDED.tipo_agregado,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    visible_actividad = EXCLUDED.visible_actividad,
    estado = EXCLUDED.estado;
