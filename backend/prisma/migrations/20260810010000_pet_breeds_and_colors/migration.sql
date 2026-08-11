WITH colores(codigo, etiqueta_es, etiqueta_en, orden, color_hex) AS (
  VALUES
    ('negro', 'Negro', 'Black', 10, '#1F2937'),
    ('blanco', 'Blanco', 'White', 20, '#F8FAFC'),
    ('gris', 'Gris', 'Gray', 30, '#6B7280'),
    ('marron', 'Marrón', 'Brown', 40, '#7C4A2D'),
    ('beige', 'Beige', 'Beige', 50, '#D6B98C'),
    ('crema', 'Crema', 'Cream', 60, '#F3E2B3'),
    ('dorado', 'Dorado', 'Golden', 70, '#D4A72C'),
    ('amarillo', 'Amarillo', 'Yellow', 80, '#EAB308'),
    ('naranja', 'Naranja', 'Orange', 90, '#EA580C'),
    ('rojizo', 'Rojizo', 'Reddish', 100, '#B45309'),
    ('canela', 'Canela', 'Cinnamon', 110, '#B7791F'),
    ('azul_gris', 'Azul grisáceo', 'Blue-gray', 120, '#64748B'),
    ('otro', 'Otro / multicolor', 'Other / multicolor', 999, '#94A3B8')
)
INSERT INTO configuracion.parametros (
  id_parametros, codigo_grupo, codigo, etiqueta, orden, color_hex, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), 'colores_mascota', codigo, etiqueta_es, orden,
       color_hex, 1, 'migration', 'migration'
FROM colores
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  orden = EXCLUDED.orden,
  color_hex = EXCLUDED.color_hex,
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

WITH colores(codigo, etiqueta_es, etiqueta_en) AS (
  VALUES
    ('negro', 'Negro', 'Black'), ('blanco', 'Blanco', 'White'),
    ('gris', 'Gris', 'Gray'), ('marron', 'Marrón', 'Brown'),
    ('beige', 'Beige', 'Beige'), ('crema', 'Crema', 'Cream'),
    ('dorado', 'Dorado', 'Golden'), ('amarillo', 'Amarillo', 'Yellow'),
    ('naranja', 'Naranja', 'Orange'), ('rojizo', 'Rojizo', 'Reddish'),
    ('canela', 'Canela', 'Cinnamon'), ('azul_gris', 'Azul grisáceo', 'Blue-gray'),
    ('otro', 'Otro / multicolor', 'Other / multicolor')
), traducciones AS (
  SELECT parametro.id_parametros, idioma.codigo_idioma, idioma.etiqueta
  FROM colores
  JOIN configuracion.parametros parametro
    ON parametro.codigo_grupo = 'colores_mascota' AND parametro.codigo = colores.codigo
  CROSS JOIN LATERAL (VALUES ('es', colores.etiqueta_es), ('en', colores.etiqueta_en)) idioma(codigo_idioma, etiqueta)
)
INSERT INTO configuracion.parametros_traducciones (
  id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta,
  created_by, updated_by
)
SELECT gen_random_uuid(), id_parametros, codigo_idioma, etiqueta,
       'migration', 'migration'
FROM traducciones
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

CREATE TABLE configuracion.razas_animales (
  id_razas_animales uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_especies_animales uuid NOT NULL REFERENCES configuracion.especies_animales(id_especies_animales) ON DELETE RESTRICT,
  codigo varchar(80) NOT NULL,
  nombre_es varchar(120) NOT NULL,
  nombre_en varchar(120) NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  estado integer NOT NULL DEFAULT 1 CHECK (estado IN (0, 1)),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  CONSTRAINT razas_animales_especie_codigo_unique UNIQUE (fid_especies_animales, codigo),
  CONSTRAINT razas_animales_id_especie_unique UNIQUE (id_razas_animales, fid_especies_animales)
);
CREATE INDEX razas_animales_especie_estado_orden_idx
  ON configuracion.razas_animales(fid_especies_animales, estado, orden);

WITH razas(especie, codigo, nombre_es, nombre_en, orden) AS (
  VALUES
    ('canino', 'mestizo', 'Mestizo', 'Mixed breed', 10),
    ('canino', 'sin_raza_definida', 'Sin raza definida', 'Unknown breed', 20),
    ('canino', 'labrador_retriever', 'Labrador retriever', 'Labrador Retriever', 30),
    ('canino', 'golden_retriever', 'Golden retriever', 'Golden Retriever', 40),
    ('canino', 'pastor_aleman', 'Pastor alemán', 'German Shepherd Dog', 50),
    ('canino', 'bulldog_frances', 'Bulldog francés', 'French Bulldog', 60),
    ('canino', 'bulldog', 'Bulldog', 'Bulldog', 70),
    ('canino', 'caniche', 'Caniche / poodle', 'Poodle', 80),
    ('canino', 'schnauzer', 'Schnauzer', 'Schnauzer', 90),
    ('canino', 'shih_tzu', 'Shih tzu', 'Shih Tzu', 100),
    ('canino', 'chihuahua', 'Chihuahua', 'Chihuahua', 110),
    ('canino', 'beagle', 'Beagle', 'Beagle', 120),
    ('canino', 'rottweiler', 'Rottweiler', 'Rottweiler', 130),
    ('canino', 'boxer', 'Bóxer', 'Boxer', 140),
    ('canino', 'husky_siberiano', 'Husky siberiano', 'Siberian Husky', 150),
    ('canino', 'dachshund', 'Dachshund / perro salchicha', 'Dachshund', 160),
    ('canino', 'yorkshire_terrier', 'Yorkshire terrier', 'Yorkshire Terrier', 170),
    ('canino', 'pug', 'Pug', 'Pug', 180),
    ('canino', 'border_collie', 'Border collie', 'Border Collie', 190),
    ('canino', 'cocker_spaniel_ingles', 'Cocker spaniel inglés', 'English Cocker Spaniel', 200),
    ('canino', 'perro_sin_pelo_peru', 'Perro sin pelo del Perú', 'Peruvian Hairless Dog', 210),
    ('felino', 'mestizo', 'Mestizo', 'Mixed breed', 10),
    ('felino', 'sin_raza_definida', 'Sin raza definida', 'Unknown breed', 20),
    ('felino', 'persa', 'Persa', 'Persian', 30),
    ('felino', 'siames', 'Siamés', 'Siamese', 40),
    ('felino', 'maine_coon', 'Maine coon', 'Maine Coon', 50),
    ('felino', 'bengala', 'Bengala', 'Bengal', 60),
    ('felino', 'britanico_pelo_corto', 'Británico de pelo corto', 'British Shorthair', 70),
    ('felino', 'ragdoll', 'Ragdoll', 'Ragdoll', 80),
    ('felino', 'sphynx', 'Sphynx', 'Sphynx', 90),
    ('felino', 'abisinio', 'Abisinio', 'Abyssinian', 100)
)
INSERT INTO configuracion.razas_animales (
  id_razas_animales, fid_especies_animales, codigo, nombre_es, nombre_en,
  orden, estado, created_by, updated_by
)
SELECT gen_random_uuid(), especie.id_especies_animales, razas.codigo,
       razas.nombre_es, razas.nombre_en, razas.orden, 1,
       'migration', 'migration'
FROM razas
JOIN configuracion.especies_animales especie ON especie.codigo = razas.especie;

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON configuracion.razas_animales
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

ALTER TABLE personas.mascotas
  DROP CONSTRAINT mascotas_subespecie_especie_fk,
  ALTER COLUMN fid_subespecies_animales DROP NOT NULL,
  ADD COLUMN fid_razas_animales uuid,
  ADD COLUMN fid_parametros_color uuid;

UPDATE personas.mascotas mascota
SET fid_parametros_color = color.id_parametros
FROM configuracion.parametros color
WHERE color.codigo_grupo = 'colores_mascota'
  AND color.codigo = CASE
    WHEN lower(btrim(mascota.color)) IN ('negro', 'black') THEN 'negro'
    WHEN lower(btrim(mascota.color)) IN ('blanco', 'white') THEN 'blanco'
    WHEN lower(btrim(mascota.color)) IN ('gris', 'gray', 'grey') THEN 'gris'
    WHEN lower(btrim(mascota.color)) IN ('marrón', 'marron', 'brown') THEN 'marron'
    ELSE 'otro'
  END;

ALTER TABLE personas.mascotas
  ALTER COLUMN fid_parametros_color SET NOT NULL,
  DROP COLUMN color,
  ADD CONSTRAINT mascotas_subespecie_especie_fk
    FOREIGN KEY (fid_subespecies_animales, fid_especies_animales)
    REFERENCES configuracion.subespecies_animales(id_subespecies_animales, fid_especies_animales)
    ON DELETE RESTRICT,
  ADD CONSTRAINT mascotas_raza_especie_fk
    FOREIGN KEY (fid_razas_animales, fid_especies_animales)
    REFERENCES configuracion.razas_animales(id_razas_animales, fid_especies_animales)
    ON DELETE RESTRICT,
  ADD CONSTRAINT mascotas_color_fk
    FOREIGN KEY (fid_parametros_color)
    REFERENCES configuracion.parametros(id_parametros)
    ON DELETE RESTRICT,
  ADD CONSTRAINT mascotas_raza_o_subespecie_check
    CHECK ((fid_razas_animales IS NOT NULL) <> (fid_subespecies_animales IS NOT NULL));

CREATE INDEX mascotas_raza_idx ON personas.mascotas(fid_razas_animales);
CREATE INDEX mascotas_color_idx ON personas.mascotas(fid_parametros_color);
