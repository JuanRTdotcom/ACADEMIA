-- "Sin documento" no representa un documento. Retira registros lógicos y maestro.
UPDATE personas.personas_documentos
SET estado = 0, updated_at = CURRENT_TIMESTAMP
WHERE codigo_tipo_documento = 'sin_documento' AND estado = 1;

DELETE FROM configuracion.parametros
WHERE codigo_grupo = 'tipos_documento' AND codigo = 'sin_documento';

INSERT INTO configuracion.parametros
  (id_parametros, codigo_grupo, codigo, etiqueta, orden, estado)
VALUES
  (gen_random_uuid(), 'grados_obtenidos', 'primaria_completa', 'Primaria completa', 10, 1),
  (gen_random_uuid(), 'grados_obtenidos', 'secundaria_completa', 'Secundaria completa', 20, 1),
  (gen_random_uuid(), 'grados_obtenidos', 'egresado_tecnico', 'Egresado técnico', 30, 1),
  (gen_random_uuid(), 'grados_obtenidos', 'titulo_tecnico', 'Título técnico', 40, 1),
  (gen_random_uuid(), 'grados_obtenidos', 'bachiller', 'Bachiller', 50, 1),
  (gen_random_uuid(), 'grados_obtenidos', 'titulo_profesional', 'Título profesional', 60, 1),
  (gen_random_uuid(), 'grados_obtenidos', 'segunda_especialidad', 'Segunda especialidad', 70, 1),
  (gen_random_uuid(), 'grados_obtenidos', 'maestro', 'Maestro', 80, 1),
  (gen_random_uuid(), 'grados_obtenidos', 'doctor', 'Doctor', 90, 1),
  (gen_random_uuid(), 'grados_obtenidos', 'otro', 'Otro', 100, 1),
  (gen_random_uuid(), 'profesiones', 'administracion', 'Administración', 10, 1),
  (gen_random_uuid(), 'profesiones', 'arquitectura', 'Arquitectura', 20, 1),
  (gen_random_uuid(), 'profesiones', 'contabilidad', 'Contabilidad', 30, 1),
  (gen_random_uuid(), 'profesiones', 'derecho', 'Derecho', 40, 1),
  (gen_random_uuid(), 'profesiones', 'economia', 'Economía', 50, 1),
  (gen_random_uuid(), 'profesiones', 'educacion', 'Educación', 60, 1),
  (gen_random_uuid(), 'profesiones', 'enfermeria', 'Enfermería', 70, 1),
  (gen_random_uuid(), 'profesiones', 'ingenieria_civil', 'Ingeniería civil', 80, 1),
  (gen_random_uuid(), 'profesiones', 'ingenieria_industrial', 'Ingeniería industrial', 90, 1),
  (gen_random_uuid(), 'profesiones', 'ingenieria_sistemas', 'Ingeniería de sistemas', 100, 1),
  (gen_random_uuid(), 'profesiones', 'medicina', 'Medicina', 110, 1),
  (gen_random_uuid(), 'profesiones', 'obstetricia', 'Obstetricia', 120, 1),
  (gen_random_uuid(), 'profesiones', 'odontologia', 'Odontología', 130, 1),
  (gen_random_uuid(), 'profesiones', 'psicologia', 'Psicología', 140, 1),
  (gen_random_uuid(), 'profesiones', 'trabajo_social', 'Trabajo social', 150, 1),
  (gen_random_uuid(), 'profesiones', 'otro', 'Otra', 160, 1),
  (gen_random_uuid(), 'tipos_estudio_complementario', 'especializacion', 'Especialización', 70, 1),
  (gen_random_uuid(), 'tipos_estudio_complementario', 'maestria', 'Maestría', 80, 1),
  (gen_random_uuid(), 'tipos_estudio_complementario', 'otro', 'Otro', 90, 1)
ON CONFLICT (codigo_grupo, codigo) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta, orden = EXCLUDED.orden, estado = 1;

INSERT INTO configuracion.parametros_traducciones
  (fid_parametros, codigo_idioma, etiqueta)
SELECT id_parametros, 'es', etiqueta FROM configuracion.parametros
WHERE codigo_grupo IN ('grados_obtenidos', 'profesiones', 'tipos_estudio_complementario')
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET etiqueta = EXCLUDED.etiqueta;

INSERT INTO configuracion.parametros_traducciones
  (fid_parametros, codigo_idioma, etiqueta)
SELECT id_parametros, 'en', CASE codigo_grupo || '.' || codigo
  WHEN 'grados_obtenidos.primaria_completa' THEN 'Completed primary education'
  WHEN 'grados_obtenidos.secundaria_completa' THEN 'Completed secondary education'
  WHEN 'grados_obtenidos.egresado_tecnico' THEN 'Technical graduate'
  WHEN 'grados_obtenidos.titulo_tecnico' THEN 'Technical degree'
  WHEN 'grados_obtenidos.bachiller' THEN 'Bachelor degree'
  WHEN 'grados_obtenidos.titulo_profesional' THEN 'Professional degree'
  WHEN 'grados_obtenidos.segunda_especialidad' THEN 'Second specialization'
  WHEN 'grados_obtenidos.maestro' THEN 'Master degree'
  WHEN 'grados_obtenidos.doctor' THEN 'Doctorate'
  WHEN 'grados_obtenidos.otro' THEN 'Other'
  WHEN 'profesiones.administracion' THEN 'Business administration'
  WHEN 'profesiones.arquitectura' THEN 'Architecture'
  WHEN 'profesiones.contabilidad' THEN 'Accounting'
  WHEN 'profesiones.derecho' THEN 'Law'
  WHEN 'profesiones.economia' THEN 'Economics'
  WHEN 'profesiones.educacion' THEN 'Education'
  WHEN 'profesiones.enfermeria' THEN 'Nursing'
  WHEN 'profesiones.ingenieria_civil' THEN 'Civil engineering'
  WHEN 'profesiones.ingenieria_industrial' THEN 'Industrial engineering'
  WHEN 'profesiones.ingenieria_sistemas' THEN 'Systems engineering'
  WHEN 'profesiones.medicina' THEN 'Medicine'
  WHEN 'profesiones.obstetricia' THEN 'Midwifery'
  WHEN 'profesiones.odontologia' THEN 'Dentistry'
  WHEN 'profesiones.psicologia' THEN 'Psychology'
  WHEN 'profesiones.trabajo_social' THEN 'Social work'
  WHEN 'profesiones.otro' THEN 'Other'
  WHEN 'tipos_estudio_complementario.curso' THEN 'Course'
  WHEN 'tipos_estudio_complementario.taller' THEN 'Workshop'
  WHEN 'tipos_estudio_complementario.seminario' THEN 'Seminar'
  WHEN 'tipos_estudio_complementario.diplomado' THEN 'Diploma program'
  WHEN 'tipos_estudio_complementario.certificacion' THEN 'Certification'
  WHEN 'tipos_estudio_complementario.congreso' THEN 'Conference'
  WHEN 'tipos_estudio_complementario.especializacion' THEN 'Specialization'
  WHEN 'tipos_estudio_complementario.maestria' THEN 'Master program'
  WHEN 'tipos_estudio_complementario.otro' THEN 'Other'
  ELSE etiqueta END
FROM configuracion.parametros
WHERE codigo_grupo IN ('grados_obtenidos', 'profesiones', 'tipos_estudio_complementario')
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET etiqueta = EXCLUDED.etiqueta;

ALTER TABLE personas.personas_estudios_realizados
  RENAME COLUMN grado_obtenido TO codigo_grado_obtenido;
ALTER TABLE personas.personas_estudios_realizados
  RENAME COLUMN profesion TO codigo_profesion;
ALTER TABLE personas.personas_estudios_realizados
  ADD COLUMN grado_obtenido_otro VARCHAR(120),
  ADD COLUMN profesion_otro VARCHAR(120);

-- Conserva cualquier texto histórico como valor personalizado.
UPDATE personas.personas_estudios_realizados
SET grado_obtenido_otro = COALESCE(NULLIF(btrim(codigo_grado_obtenido), ''), 'No especificado'),
    codigo_grado_obtenido = 'otro',
    profesion_otro = COALESCE(NULLIF(btrim(codigo_profesion), ''), 'No especificada'),
    codigo_profesion = 'otro';

ALTER TABLE personas.personas_estudios_realizados
  ALTER COLUMN codigo_grado_obtenido SET NOT NULL,
  ALTER COLUMN codigo_profesion SET NOT NULL,
  ADD CONSTRAINT estudios_realizados_estado_valido CHECK (estado IN (0,1)),
  ADD CONSTRAINT estudios_realizados_fechas_validas CHECK (
    (en_curso AND fecha_fin IS NULL) OR
    (NOT en_curso AND fecha_fin IS NOT NULL AND fecha_fin >= fecha_inicio)
  ),
  ADD CONSTRAINT estudios_realizados_grado_otro_valido CHECK (
    (codigo_grado_obtenido = 'otro' AND char_length(btrim(grado_obtenido_otro)) BETWEEN 2 AND 120) OR
    (codigo_grado_obtenido <> 'otro' AND grado_obtenido_otro IS NULL)
  ),
  ADD CONSTRAINT estudios_realizados_profesion_otra_valida CHECK (
    (codigo_profesion = 'otro' AND char_length(btrim(profesion_otro)) BETWEEN 2 AND 120) OR
    (codigo_profesion <> 'otro' AND profesion_otro IS NULL)
  );

ALTER TABLE personas.personas_estudios_complementarios
  ADD COLUMN tipo_estudio_otro VARCHAR(120),
  ADD CONSTRAINT estudios_complementarios_estado_valido CHECK (estado IN (0,1)),
  ADD CONSTRAINT estudios_complementarios_fechas_validas CHECK (
    (en_curso AND fecha_fin IS NULL) OR
    (NOT en_curso AND fecha_fin IS NOT NULL AND fecha_fin >= fecha_inicio)
  ),
  ADD CONSTRAINT estudios_complementarios_tipo_otro_valido CHECK (
    (codigo_tipo_estudio = 'otro' AND char_length(btrim(tipo_estudio_otro)) BETWEEN 2 AND 120) OR
    (codigo_tipo_estudio <> 'otro' AND tipo_estudio_otro IS NULL)
  ),
  ADD CONSTRAINT estudios_complementarios_institucion_valida CHECK (
    char_length(btrim(institucion)) BETWEEN 2 AND 150
  );

CREATE INDEX estudios_realizados_nivel_idx ON personas.personas_estudios_realizados(codigo_nivel_instruccion);
CREATE INDEX estudios_realizados_grado_idx ON personas.personas_estudios_realizados(codigo_grado_obtenido);
CREATE INDEX estudios_realizados_profesion_idx ON personas.personas_estudios_realizados(codigo_profesion);
CREATE UNIQUE INDEX estudios_realizados_activo_uidx
ON personas.personas_estudios_realizados(fid_personas, codigo_nivel_instruccion, codigo_grado_obtenido, codigo_profesion, fecha_inicio)
WHERE estado = 1;

CREATE INDEX estudios_complementarios_tipo_idx ON personas.personas_estudios_complementarios(codigo_tipo_estudio);
CREATE UNIQUE INDEX estudios_complementarios_activo_uidx
ON personas.personas_estudios_complementarios(fid_personas, codigo_tipo_estudio, lower(institucion), fecha_inicio)
WHERE estado = 1;

DROP TRIGGER IF EXISTS establecer_updated_at ON personas.personas_estudios_realizados;
CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas_estudios_realizados
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();
DROP TRIGGER IF EXISTS establecer_updated_at ON personas.personas_estudios_complementarios;
CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas_estudios_complementarios
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO eventos.eventos_maestro
  (id_eventos_maestro, codigo, tipo_agregado, nombre, descripcion, version, visible_actividad, estado)
VALUES
  (gen_random_uuid(), 'perfil.estudio_realizado.agregado', 'personas_estudios_realizados', 'Estudio agregado', 'El usuario agregó un estudio realizado.', 1, TRUE, 1),
  (gen_random_uuid(), 'perfil.estudio_realizado.modificado', 'personas_estudios_realizados', 'Estudio modificado', 'El usuario modificó un estudio realizado.', 1, TRUE, 1),
  (gen_random_uuid(), 'perfil.estudio_realizado.eliminado', 'personas_estudios_realizados', 'Estudio eliminado', 'El usuario eliminó un estudio realizado.', 1, TRUE, 1),
  (gen_random_uuid(), 'perfil.estudio_complementario.agregado', 'personas_estudios_complementarios', 'Estudio complementario agregado', 'El usuario agregó un estudio complementario.', 1, TRUE, 1),
  (gen_random_uuid(), 'perfil.estudio_complementario.modificado', 'personas_estudios_complementarios', 'Estudio complementario modificado', 'El usuario modificó un estudio complementario.', 1, TRUE, 1),
  (gen_random_uuid(), 'perfil.estudio_complementario.eliminado', 'personas_estudios_complementarios', 'Estudio complementario eliminado', 'El usuario eliminó un estudio complementario.', 1, TRUE, 1)
ON CONFLICT (codigo, version) DO UPDATE SET
  tipo_agregado = EXCLUDED.tipo_agregado, nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion, visible_actividad = TRUE, estado = 1;
