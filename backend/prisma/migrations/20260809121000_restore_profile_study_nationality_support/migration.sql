-- Restaura traducciones y contratos de auditoría ausentes en bases que fueron
-- inicializadas desde un historial parcial. Mantiene los catálogos en PostgreSQL.

-- Español conserva la etiqueta maestra actual.
INSERT INTO configuracion.parametros_traducciones
  (id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta)
SELECT gen_random_uuid(), id_parametros, 'es', etiqueta
FROM configuracion.parametros
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta;

-- Inglés. Los nombres legales de aseguradoras conservan su denominación oficial.
INSERT INTO configuracion.parametros_traducciones
  (id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta)
SELECT gen_random_uuid(), id_parametros, 'en', CASE codigo_grupo || '.' || codigo
  WHEN 'estados_civiles.soltero' THEN 'Single'
  WHEN 'estados_civiles.casado' THEN 'Married'
  WHEN 'estados_civiles.conviviente' THEN 'Domestic partnership'
  WHEN 'estados_civiles.separado' THEN 'Separated'
  WHEN 'estados_civiles.divorciado' THEN 'Divorced'
  WHEN 'estados_civiles.viudo' THEN 'Widowed'
  WHEN 'frecuencias_hobby.diaria' THEN 'Daily'
  WHEN 'frecuencias_hobby.semanal' THEN 'Weekly'
  WHEN 'frecuencias_hobby.quincenal' THEN 'Biweekly'
  WHEN 'frecuencias_hobby.mensual' THEN 'Monthly'
  WHEN 'frecuencias_hobby.ocasional' THEN 'Occasional'
  WHEN 'hobbies.lectura' THEN 'Reading'
  WHEN 'hobbies.escritura' THEN 'Writing'
  WHEN 'hobbies.fotografia' THEN 'Photography'
  WHEN 'hobbies.pintura_dibujo' THEN 'Painting and drawing'
  WHEN 'hobbies.musica_canto' THEN 'Music and singing'
  WHEN 'hobbies.tocar_instrumentos' THEN 'Playing instruments'
  WHEN 'hobbies.cine_series' THEN 'Movies and series'
  WHEN 'hobbies.videojuegos' THEN 'Video games'
  WHEN 'hobbies.programacion_tecnologia' THEN 'Programming and technology'
  WHEN 'hobbies.ajedrez_juegos_mesa' THEN 'Chess and board games'
  WHEN 'hobbies.cocina_reposteria' THEN 'Cooking and baking'
  WHEN 'hobbies.jardineria' THEN 'Gardening'
  WHEN 'hobbies.bricolaje_manualidades' THEN 'DIY and crafts'
  WHEN 'hobbies.gimnasio_fitness' THEN 'Gym and fitness'
  WHEN 'hobbies.running_atletismo' THEN 'Running and athletics'
  WHEN 'hobbies.futbol' THEN 'Football'
  WHEN 'hobbies.basquetbol' THEN 'Basketball'
  WHEN 'hobbies.natacion' THEN 'Swimming'
  WHEN 'hobbies.ciclismo' THEN 'Cycling'
  WHEN 'hobbies.senderismo_montanismo' THEN 'Hiking and mountaineering'
  WHEN 'hobbies.viajes_turismo' THEN 'Travel and tourism'
  WHEN 'hobbies.baile_danza' THEN 'Dance'
  WHEN 'hobbies.yoga_meditacion' THEN 'Yoga and meditation'
  WHEN 'hobbies.voluntariado' THEN 'Volunteering'
  WHEN 'hobbies.aprender_idiomas' THEN 'Language learning'
  WHEN 'hobbies.coleccionismo' THEN 'Collecting'
  WHEN 'hobbies.fotografia_naturaleza' THEN 'Nature photography'
  WHEN 'hobbies.teatro_actuacion' THEN 'Theater and acting'
  WHEN 'hobbies.astronomia_aficionada' THEN 'Amateur astronomy'
  WHEN 'hobbies.modelismo' THEN 'Model making'
  WHEN 'hobbies.otros' THEN 'Other'
  WHEN 'niveles_instruccion.sin_instruccion' THEN 'No formal education'
  WHEN 'niveles_instruccion.primaria' THEN 'Primary education'
  WHEN 'niveles_instruccion.secundaria' THEN 'Secondary education'
  WHEN 'niveles_instruccion.tecnico' THEN 'Technical education'
  WHEN 'niveles_instruccion.universitario' THEN 'University education'
  WHEN 'niveles_instruccion.posgrado' THEN 'Postgraduate education'
  WHEN 'seguros.seguro_integral_de_salud_sis' THEN 'Comprehensive Health Insurance (SIS)'
  WHEN 'seguros.seguro_social_de_salud_essalud' THEN 'Social Health Insurance (EsSalud)'
  WHEN 'seguros.fondo_de_salud_de_la_marina_fosmar' THEN 'Navy Health Fund (FOSMAR)'
  WHEN 'seguros.fondo_de_salud_de_la_fuerza_aerea_fosfap' THEN 'Air Force Health Fund (FOSFAP)'
  WHEN 'seguros.fondo_de_salud_del_ejercito_fosoli' THEN 'Army Health Fund (FOSOLI)'
  WHEN 'seguros.fondo_de_aseguramiento_en_salud_de_la_policia_nacional_saludpol' THEN 'National Police Health Insurance Fund (SALUDPOL)'
  WHEN 'seguros.otro' THEN 'Other'
  WHEN 'sexos.masculino' THEN 'Male'
  WHEN 'sexos.femenino' THEN 'Female'
  WHEN 'sexos.no_especificado' THEN 'Unspecified'
  WHEN 'tipos_documento.dni' THEN 'DNI'
  WHEN 'tipos_documento.carnet_extranjeria' THEN 'Foreigner ID card'
  WHEN 'tipos_documento.pasaporte' THEN 'Passport'
  WHEN 'tipos_documento.cedula' THEN 'National ID card'
  WHEN 'tipos_documento.permiso_permanencia_temporal' THEN 'Temporary residence permit'
  WHEN 'tipos_documento.sin_documento' THEN 'No document'
  WHEN 'tipos_estudio_complementario.curso' THEN 'Course'
  WHEN 'tipos_estudio_complementario.taller' THEN 'Workshop'
  WHEN 'tipos_estudio_complementario.seminario' THEN 'Seminar'
  WHEN 'tipos_estudio_complementario.diplomado' THEN 'Diploma program'
  WHEN 'tipos_estudio_complementario.certificacion' THEN 'Certification'
  WHEN 'tipos_estudio_complementario.congreso' THEN 'Conference'
  WHEN 'tipos_telefono.movil' THEN 'Mobile'
  WHEN 'tipos_telefono.fijo' THEN 'Landline'
  WHEN 'tipos_telefono.trabajo' THEN 'Work'
  WHEN 'tipos_telefono.otro' THEN 'Other'
  ELSE etiqueta
END
FROM configuracion.parametros
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta;

-- Las traducciones académicas se agregaron después del catálogo general.
INSERT INTO configuracion.parametros_traducciones
  (id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta)
SELECT gen_random_uuid(), id_parametros, 'es', etiqueta FROM configuracion.parametros
WHERE codigo_grupo IN ('grados_obtenidos', 'profesiones', 'tipos_estudio_complementario')
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET etiqueta = EXCLUDED.etiqueta;

INSERT INTO configuracion.parametros_traducciones
  (id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta)
SELECT gen_random_uuid(), id_parametros, 'en', CASE codigo_grupo || '.' || codigo
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

-- Contratos funcionales requeridos por las transacciones de perfil.
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
