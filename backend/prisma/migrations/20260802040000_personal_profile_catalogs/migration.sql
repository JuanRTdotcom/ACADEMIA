INSERT INTO configuracion.parametros
  (id_parametros, codigo_grupo, codigo, etiqueta, orden, estado)
VALUES
  (gen_random_uuid(), 'tipos_documento', 'dni', 'DNI', 10, 1),
  (gen_random_uuid(), 'tipos_documento', 'carnet_extranjeria', 'Carnet de extranjería', 20, 1),
  (gen_random_uuid(), 'tipos_documento', 'pasaporte', 'Pasaporte', 30, 1),
  (gen_random_uuid(), 'tipos_documento', 'cedula', 'Cédula', 40, 1),
  (gen_random_uuid(), 'tipos_documento', 'permiso_permanencia_temporal', 'Permiso de permanencia temporal', 50, 1),
  (gen_random_uuid(), 'tipos_documento', 'sin_documento', 'Sin documento', 60, 1),
  (gen_random_uuid(), 'sexos', 'masculino', 'Masculino', 10, 1),
  (gen_random_uuid(), 'sexos', 'femenino', 'Femenino', 20, 1),
  (gen_random_uuid(), 'sexos', 'no_especificado', 'No especificado', 30, 1)
ON CONFLICT (codigo_grupo, codigo) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta,
    orden = EXCLUDED.orden,
    estado = 1;
