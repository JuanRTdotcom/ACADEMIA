CREATE TABLE configuracion.parametros_traducciones (
  id_parametros_traducciones UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_parametros UUID NOT NULL,
  codigo_idioma VARCHAR(10) NOT NULL,
  etiqueta VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  CONSTRAINT parametros_traducciones_parametro_fkey
    FOREIGN KEY (fid_parametros) REFERENCES configuracion.parametros(id_parametros)
    ON DELETE CASCADE,
  CONSTRAINT parametros_traducciones_idioma_valido
    CHECK (codigo_idioma ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'),
  CONSTRAINT parametros_traducciones_etiqueta_valida
    CHECK (char_length(btrim(etiqueta)) BETWEEN 1 AND 160),
  CONSTRAINT parametros_traducciones_unica
    UNIQUE (fid_parametros, codigo_idioma)
);

CREATE INDEX parametros_traducciones_idioma_idx
ON configuracion.parametros_traducciones(codigo_idioma);

DROP TRIGGER IF EXISTS establecer_updated_at
ON configuracion.parametros_traducciones;
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON configuracion.parametros_traducciones
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

-- Español conserva la etiqueta maestra actual.
INSERT INTO configuracion.parametros_traducciones
  (fid_parametros, codigo_idioma, etiqueta)
SELECT id_parametros, 'es', etiqueta
FROM configuracion.parametros
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta;

-- Inglés. Los nombres legales de aseguradoras conservan su denominación oficial.
INSERT INTO configuracion.parametros_traducciones
  (fid_parametros, codigo_idioma, etiqueta)
SELECT id_parametros, 'en', CASE codigo_grupo || '.' || codigo
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
