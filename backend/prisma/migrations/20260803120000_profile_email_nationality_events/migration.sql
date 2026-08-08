INSERT INTO eventos.eventos_maestro
  (id_eventos_maestro, codigo, tipo_agregado, nombre, descripcion, version, visible_actividad, estado)
VALUES
  (
    gen_random_uuid(),
    'perfil.correo.agregado',
    'personas_correos',
    'Correo agregado',
    'El usuario agregó un correo a su perfil.',
    1,
    TRUE,
    1
  ),
  (
    gen_random_uuid(),
    'perfil.correo.uso_seleccionado',
    'personas_correos_usos',
    'Uso de correo asignado',
    'El usuario asignó un correo a un uso de su cuenta.',
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
  ),
  (
    gen_random_uuid(),
    'perfil.nacionalidad.agregada',
    'personas_nacionalidades',
    'Nacionalidad agregada',
    'El usuario agregó una nacionalidad a su perfil.',
    1,
    TRUE,
    1
  ),
  (
    gen_random_uuid(),
    'perfil.nacionalidad.eliminada',
    'personas_nacionalidades',
    'Nacionalidad eliminada',
    'El usuario eliminó una nacionalidad de su perfil.',
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
