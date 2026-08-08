INSERT INTO eventos.eventos_maestro
  (id_eventos_maestro, codigo, tipo_agregado, nombre, descripcion, version, visible_actividad, estado)
VALUES
  (
    gen_random_uuid(),
    'perfil.correo.modificado',
    'personas_correos',
    'Correo modificado',
    'El usuario modificó un correo de su perfil.',
    1,
    TRUE,
    1
  ),
  (
    gen_random_uuid(),
    'perfil.correo.eliminado',
    'personas_correos',
    'Correo eliminado',
    'El usuario eliminó un correo de su perfil.',
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
