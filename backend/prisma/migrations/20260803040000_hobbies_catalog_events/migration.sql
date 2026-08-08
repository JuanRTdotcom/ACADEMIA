-- Catálogo de hobbies (grupo 'hobbies' en configuracion.parametros) + eventos de
-- auditoría de hobbies. Idempotente: seguro de re-aplicar. Se pueden agregar o
-- desactivar hobbies administrando la tabla `parametros`.

INSERT INTO configuracion.parametros (id_parametros, codigo_grupo, codigo, etiqueta, orden)
VALUES
  (gen_random_uuid(), 'hobbies', 'lectura', 'Lectura', 10),
  (gen_random_uuid(), 'hobbies', 'escritura', 'Escritura', 20),
  (gen_random_uuid(), 'hobbies', 'fotografia', 'Fotografía', 30),
  (gen_random_uuid(), 'hobbies', 'pintura_dibujo', 'Pintura y Dibujo', 40),
  (gen_random_uuid(), 'hobbies', 'musica_canto', 'Música y Canto', 50),
  (gen_random_uuid(), 'hobbies', 'tocar_instrumentos', 'Tocar Instrumentos', 60),
  (gen_random_uuid(), 'hobbies', 'cine_series', 'Cine y Series', 70),
  (gen_random_uuid(), 'hobbies', 'videojuegos', 'Videojuegos', 80),
  (gen_random_uuid(), 'hobbies', 'programacion_tecnologia', 'Programación y Tecnología', 90),
  (gen_random_uuid(), 'hobbies', 'ajedrez_juegos_mesa', 'Ajedrez y Juegos de Mesa', 100),
  (gen_random_uuid(), 'hobbies', 'cocina_reposteria', 'Cocina y Repostería', 110),
  (gen_random_uuid(), 'hobbies', 'jardineria', 'Jardinería', 120),
  (gen_random_uuid(), 'hobbies', 'bricolaje_manualidades', 'Bricolaje y Manualidades', 130),
  (gen_random_uuid(), 'hobbies', 'gimnasio_fitness', 'Gimnasio y Fitness', 140),
  (gen_random_uuid(), 'hobbies', 'running_atletismo', 'Running y Atletismo', 150),
  (gen_random_uuid(), 'hobbies', 'futbol', 'Fútbol', 160),
  (gen_random_uuid(), 'hobbies', 'basquetbol', 'Básquetbol', 170),
  (gen_random_uuid(), 'hobbies', 'natacion', 'Natación', 180),
  (gen_random_uuid(), 'hobbies', 'ciclismo', 'Ciclismo', 190),
  (gen_random_uuid(), 'hobbies', 'senderismo_montanismo', 'Senderismo y Montañismo', 200),
  (gen_random_uuid(), 'hobbies', 'viajes_turismo', 'Viajes y Turismo', 210),
  (gen_random_uuid(), 'hobbies', 'baile_danza', 'Baile y Danza', 220),
  (gen_random_uuid(), 'hobbies', 'yoga_meditacion', 'Yoga y Meditación', 230),
  (gen_random_uuid(), 'hobbies', 'voluntariado', 'Voluntariado', 240),
  (gen_random_uuid(), 'hobbies', 'aprender_idiomas', 'Aprender Idiomas', 250),
  (gen_random_uuid(), 'hobbies', 'coleccionismo', 'Coleccionismo', 260),
  (gen_random_uuid(), 'hobbies', 'fotografia_naturaleza', 'Fotografía de Naturaleza', 270),
  (gen_random_uuid(), 'hobbies', 'teatro_actuacion', 'Teatro y Actuación', 280),
  (gen_random_uuid(), 'hobbies', 'astronomia_aficionada', 'Astronomía Aficionada', 290),
  (gen_random_uuid(), 'hobbies', 'modelismo', 'Modelismo', 300),
  (gen_random_uuid(), 'hobbies', 'otros', 'Otros', 310)
ON CONFLICT (codigo_grupo, codigo) DO NOTHING;

INSERT INTO eventos.eventos_maestro
  (id_eventos_maestro, codigo, tipo_agregado, nombre, descripcion, version, visible_actividad, estado)
VALUES
  (gen_random_uuid(), 'perfil.hobby.agregado', 'personas_hobbies', 'Hobby agregado', 'El usuario agregó un hobby a su perfil.', 1, true, 1),
  (gen_random_uuid(), 'perfil.hobby.eliminado', 'personas_hobbies', 'Hobby eliminado', 'El usuario eliminó un hobby de su perfil.', 1, true, 1)
ON CONFLICT (codigo, version) DO NOTHING;
