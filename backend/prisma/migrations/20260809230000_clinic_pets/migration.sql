ALTER TABLE configuracion.parametros
  ADD COLUMN IF NOT EXISTS color_hex varchar(7);

ALTER TABLE configuracion.parametros
  ADD CONSTRAINT parametros_color_hex_check
  CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$');

WITH maestros(grupo, codigo, etiqueta_es, etiqueta_en, orden, color_hex) AS (
  VALUES
    ('generos_mascota', 'macho', 'Macho', 'Male', 10, NULL),
    ('generos_mascota', 'hembra', 'Hembra', 'Female', 20, NULL),
    ('generos_mascota', 'desconocido', 'Desconocido', 'Unknown', 30, NULL),
    ('unidades_peso_mascota', 'kg', 'Kilogramos (kg)', 'Kilograms (kg)', 10, NULL),
    ('unidades_peso_mascota', 'g', 'Gramos (g)', 'Grams (g)', 20, NULL),
    ('unidades_peso_mascota', 'lb', 'Libras (lb)', 'Pounds (lb)', 30, NULL),
    ('unidades_peso_mascota', 'oz', 'Onzas (oz)', 'Ounces (oz)', 40, NULL),
    ('tallas_mascota', 'miniatura', 'Miniatura', 'Miniature', 10, NULL),
    ('tallas_mascota', 'pequeno', 'Pequeño', 'Small', 20, NULL),
    ('tallas_mascota', 'mediano', 'Mediano', 'Medium', 30, NULL),
    ('tallas_mascota', 'grande', 'Grande', 'Large', 40, NULL),
    ('tallas_mascota', 'gigante', 'Gigante', 'Giant', 50, NULL),
    ('tallas_mascota', 'desconocido', 'Desconocido', 'Unknown', 60, NULL),
    ('estados_reproductivos_mascota', 'esterilizado', 'Esterilizado', 'Sterilized', 10, NULL),
    ('estados_reproductivos_mascota', 'no_esterilizado', 'No esterilizado', 'Not sterilized', 20, NULL),
    ('estados_reproductivos_mascota', 'desconocido', 'Desconocido', 'Unknown', 30, NULL),
    ('temperamentos_mascota', 'muy_docil', 'Muy dócil', 'Very docile', 10, '#16A34A'),
    ('temperamentos_mascota', 'docil', 'Dócil', 'Docile', 20, '#65A30D'),
    ('temperamentos_mascota', 'reservado', 'Reservado', 'Reserved', 30, '#CA8A04'),
    ('temperamentos_mascota', 'reactivo', 'Reactivo', 'Reactive', 40, '#EA580C'),
    ('temperamentos_mascota', 'agresivo', 'Agresivo', 'Aggressive', 50, '#DC2626')
)
INSERT INTO configuracion.parametros (
  id_parametros, codigo_grupo, codigo, etiqueta, orden, color_hex, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), grupo, codigo, etiqueta_es, orden, color_hex, 1,
       'migration', 'migration'
FROM maestros
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  orden = EXCLUDED.orden,
  color_hex = EXCLUDED.color_hex,
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

WITH maestros(grupo, codigo, etiqueta_es, etiqueta_en, orden, color_hex) AS (
  VALUES
    ('generos_mascota', 'macho', 'Macho', 'Male', 10, NULL),
    ('generos_mascota', 'hembra', 'Hembra', 'Female', 20, NULL),
    ('generos_mascota', 'desconocido', 'Desconocido', 'Unknown', 30, NULL),
    ('unidades_peso_mascota', 'kg', 'Kilogramos (kg)', 'Kilograms (kg)', 10, NULL),
    ('unidades_peso_mascota', 'g', 'Gramos (g)', 'Grams (g)', 20, NULL),
    ('unidades_peso_mascota', 'lb', 'Libras (lb)', 'Pounds (lb)', 30, NULL),
    ('unidades_peso_mascota', 'oz', 'Onzas (oz)', 'Ounces (oz)', 40, NULL),
    ('tallas_mascota', 'miniatura', 'Miniatura', 'Miniature', 10, NULL),
    ('tallas_mascota', 'pequeno', 'Pequeño', 'Small', 20, NULL),
    ('tallas_mascota', 'mediano', 'Mediano', 'Medium', 30, NULL),
    ('tallas_mascota', 'grande', 'Grande', 'Large', 40, NULL),
    ('tallas_mascota', 'gigante', 'Gigante', 'Giant', 50, NULL),
    ('tallas_mascota', 'desconocido', 'Desconocido', 'Unknown', 60, NULL),
    ('estados_reproductivos_mascota', 'esterilizado', 'Esterilizado', 'Sterilized', 10, NULL),
    ('estados_reproductivos_mascota', 'no_esterilizado', 'No esterilizado', 'Not sterilized', 20, NULL),
    ('estados_reproductivos_mascota', 'desconocido', 'Desconocido', 'Unknown', 30, NULL),
    ('temperamentos_mascota', 'muy_docil', 'Muy dócil', 'Very docile', 10, '#16A34A'),
    ('temperamentos_mascota', 'docil', 'Dócil', 'Docile', 20, '#65A30D'),
    ('temperamentos_mascota', 'reservado', 'Reservado', 'Reserved', 30, '#CA8A04'),
    ('temperamentos_mascota', 'reactivo', 'Reactivo', 'Reactive', 40, '#EA580C'),
    ('temperamentos_mascota', 'agresivo', 'Agresivo', 'Aggressive', 50, '#DC2626')
), traducciones AS (
  SELECT parametro.id_parametros, idioma.codigo_idioma, idioma.etiqueta
  FROM maestros
  JOIN configuracion.parametros parametro
    ON parametro.codigo_grupo = maestros.grupo AND parametro.codigo = maestros.codigo
  CROSS JOIN LATERAL (VALUES ('es', maestros.etiqueta_es), ('en', maestros.etiqueta_en)) idioma(codigo_idioma, etiqueta)
)
INSERT INTO configuracion.parametros_traducciones (
  id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta,
  created_by, updated_by
)
SELECT gen_random_uuid(), id_parametros, codigo_idioma, etiqueta, 'migration', 'migration'
FROM traducciones
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

CREATE TABLE configuracion.especies_animales (
  id_especies_animales uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(60) NOT NULL UNIQUE,
  nombre_es varchar(100) NOT NULL,
  nombre_en varchar(100) NOT NULL,
  nombre_cientifico varchar(140),
  orden integer NOT NULL DEFAULT 0,
  estado integer NOT NULL DEFAULT 1 CHECK (estado IN (0, 1)),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text
);

CREATE TABLE configuracion.subespecies_animales (
  id_subespecies_animales uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_especies_animales uuid NOT NULL REFERENCES configuracion.especies_animales(id_especies_animales) ON DELETE RESTRICT,
  codigo varchar(60) NOT NULL,
  nombre_es varchar(120) NOT NULL,
  nombre_en varchar(120) NOT NULL,
  nombre_cientifico varchar(140),
  orden integer NOT NULL DEFAULT 0,
  estado integer NOT NULL DEFAULT 1 CHECK (estado IN (0, 1)),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  CONSTRAINT subespecies_animales_especie_codigo_unique UNIQUE (fid_especies_animales, codigo)
);
CREATE INDEX subespecies_animales_especie_estado_orden_idx
  ON configuracion.subespecies_animales(fid_especies_animales, estado, orden);

WITH especies(codigo, nombre_es, nombre_en, nombre_cientifico, orden) AS (
  VALUES
    ('canino', 'Canino', 'Canine', 'Canis lupus familiaris', 10),
    ('felino', 'Felino', 'Feline', 'Felis catus', 20),
    ('ave', 'Ave', 'Bird', NULL, 30),
    ('lagomorfo', 'Lagomorfo', 'Lagomorph', NULL, 40),
    ('roedor', 'Roedor', 'Rodent', NULL, 50),
    ('reptil', 'Reptil', 'Reptile', NULL, 60),
    ('anfibio', 'Anfibio', 'Amphibian', NULL, 70),
    ('pez', 'Pez', 'Fish', NULL, 80),
    ('mustelido', 'Mustélido', 'Mustelid', NULL, 90),
    ('equino', 'Equino', 'Equine', 'Equus', 100),
    ('bovino', 'Bovino', 'Bovine', 'Bos taurus', 110),
    ('ovino', 'Ovino', 'Ovine', 'Ovis aries', 120),
    ('caprino', 'Caprino', 'Caprine', 'Capra hircus', 130),
    ('porcino', 'Porcino', 'Porcine', 'Sus scrofa domesticus', 140),
    ('camelido', 'Camélido sudamericano', 'South American camelid', NULL, 150),
    ('otro', 'Otro', 'Other', NULL, 999)
)
INSERT INTO configuracion.especies_animales (
  id_especies_animales, codigo, nombre_es, nombre_en, nombre_cientifico, orden,
  estado, created_by, updated_by
)
SELECT gen_random_uuid(), codigo, nombre_es, nombre_en, nombre_cientifico, orden,
       1, 'migration', 'migration'
FROM especies;

WITH tipos(especie, codigo, nombre_es, nombre_en, nombre_cientifico, orden) AS (
  VALUES
    ('canino', 'perro_domestico', 'Perro doméstico', 'Domestic dog', 'Canis lupus familiaris', 10),
    ('felino', 'gato_domestico', 'Gato doméstico', 'Domestic cat', 'Felis catus', 10),
    ('ave', 'psitacido', 'Loro, perico o guacamayo', 'Parrot, parakeet or macaw', 'Psittaciformes', 10),
    ('ave', 'canario', 'Canario', 'Canary', 'Serinus canaria domestica', 20),
    ('ave', 'pinzon', 'Pinzón', 'Finch', 'Fringillidae', 30),
    ('ave', 'paloma', 'Paloma', 'Pigeon or dove', 'Columbidae', 40),
    ('ave', 'ave_corral', 'Ave de corral', 'Poultry', 'Galliformes / Anseriformes', 50),
    ('lagomorfo', 'conejo_domestico', 'Conejo doméstico', 'Domestic rabbit', 'Oryctolagus cuniculus domesticus', 10),
    ('roedor', 'cobayo', 'Cobayo / cuy', 'Guinea pig', 'Cavia porcellus', 10),
    ('roedor', 'hamster', 'Hámster', 'Hamster', 'Cricetinae', 20),
    ('roedor', 'chinchilla', 'Chinchilla', 'Chinchilla', 'Chinchilla lanigera', 30),
    ('roedor', 'rata', 'Rata doméstica', 'Domestic rat', 'Rattus norvegicus domestica', 40),
    ('roedor', 'raton', 'Ratón doméstico', 'Domestic mouse', 'Mus musculus', 50),
    ('roedor', 'jerbo', 'Jerbo', 'Gerbil', 'Meriones unguiculatus', 60),
    ('reptil', 'tortuga', 'Tortuga', 'Turtle or tortoise', 'Testudines', 10),
    ('reptil', 'serpiente', 'Serpiente', 'Snake', 'Serpentes', 20),
    ('reptil', 'lagarto', 'Lagarto', 'Lizard', 'Lacertilia', 30),
    ('reptil', 'iguana', 'Iguana', 'Iguana', 'Iguana iguana', 40),
    ('anfibio', 'rana', 'Rana', 'Frog', 'Anura', 10),
    ('anfibio', 'sapo', 'Sapo', 'Toad', 'Bufonidae', 20),
    ('anfibio', 'salamandra', 'Salamandra', 'Salamander', 'Caudata', 30),
    ('pez', 'agua_dulce', 'Pez de agua dulce', 'Freshwater fish', NULL, 10),
    ('pez', 'agua_marina', 'Pez marino', 'Marine fish', NULL, 20),
    ('mustelido', 'huron_domestico', 'Hurón doméstico', 'Domestic ferret', 'Mustela putorius furo', 10),
    ('equino', 'caballo', 'Caballo', 'Horse', 'Equus caballus', 10),
    ('equino', 'burro', 'Burro', 'Donkey', 'Equus asinus', 20),
    ('equino', 'mula', 'Mula', 'Mule', NULL, 30),
    ('bovino', 'ganado_vacuno', 'Ganado vacuno', 'Cattle', 'Bos taurus', 10),
    ('ovino', 'oveja', 'Oveja', 'Sheep', 'Ovis aries', 10),
    ('caprino', 'cabra', 'Cabra', 'Goat', 'Capra hircus', 10),
    ('porcino', 'cerdo', 'Cerdo', 'Pig', 'Sus scrofa domesticus', 10),
    ('porcino', 'minipig', 'Cerdo miniatura', 'Miniature pig', 'Sus scrofa domesticus', 20),
    ('camelido', 'alpaca', 'Alpaca', 'Alpaca', 'Vicugna pacos', 10),
    ('camelido', 'llama', 'Llama', 'Llama', 'Lama glama', 20),
    ('otro', 'otro', 'Otro', 'Other', NULL, 999)
)
INSERT INTO configuracion.subespecies_animales (
  id_subespecies_animales, fid_especies_animales, codigo, nombre_es, nombre_en,
  nombre_cientifico, orden, estado, created_by, updated_by
)
SELECT gen_random_uuid(), especie.id_especies_animales, tipos.codigo,
       tipos.nombre_es, tipos.nombre_en, tipos.nombre_cientifico, tipos.orden,
       1, 'migration', 'migration'
FROM tipos
JOIN configuracion.especies_animales especie ON especie.codigo = tipos.especie;

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON configuracion.especies_animales
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON configuracion.subespecies_animales
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

CREATE TABLE personas.mascotas (
  id_mascotas uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE CASCADE,
  fid_propietarios uuid REFERENCES personas.propietarios(id_propietarios) ON DELETE RESTRICT,
  foto_url text NOT NULL,
  animal_servicio boolean NOT NULL DEFAULT false,
  apoyo_emocional boolean NOT NULL DEFAULT false,
  nombre varchar(120) NOT NULL,
  codigo_chip varchar(50),
  fid_especies_animales uuid NOT NULL REFERENCES configuracion.especies_animales(id_especies_animales) ON DELETE RESTRICT,
  fid_subespecies_animales uuid NOT NULL REFERENCES configuracion.subespecies_animales(id_subespecies_animales) ON DELETE RESTRICT,
  fid_parametros_genero uuid NOT NULL REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  color varchar(100) NOT NULL,
  fecha_nacimiento date NOT NULL,
  peso decimal(8,3) NOT NULL,
  fid_parametros_unidad_peso uuid NOT NULL REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  fid_parametros_talla uuid NOT NULL REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  fid_parametros_estado_reproductivo uuid NOT NULL REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  fid_parametros_temperamento uuid NOT NULL REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  alimento varchar(250),
  estado integer NOT NULL DEFAULT 1 CHECK (estado IN (0, 1)),
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT mascotas_nombre_check CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 120),
  CONSTRAINT mascotas_color_check CHECK (char_length(btrim(color)) BETWEEN 1 AND 100),
  CONSTRAINT mascotas_peso_check CHECK (peso > 0),
  CONSTRAINT mascotas_fecha_nacimiento_check CHECK (fecha_nacimiento >= DATE '1900-01-01'),
  CONSTRAINT mascotas_eliminado_estado_check CHECK (eliminado_en IS NULL OR estado = 0)
);
CREATE UNIQUE INDEX mascotas_chip_activo_unique
  ON personas.mascotas(fid_organizaciones, upper(btrim(codigo_chip)))
  WHERE eliminado_en IS NULL AND codigo_chip IS NOT NULL;
CREATE INDEX mascotas_organizacion_eliminado_nombre_idx
  ON personas.mascotas(fid_organizaciones, eliminado_en, nombre);
CREATE INDEX mascotas_propietario_idx ON personas.mascotas(fid_propietarios);
CREATE INDEX mascotas_especie_idx ON personas.mascotas(fid_especies_animales);
CREATE INDEX mascotas_subespecie_idx ON personas.mascotas(fid_subespecies_animales);
CREATE INDEX mascotas_genero_idx ON personas.mascotas(fid_parametros_genero);
CREATE INDEX mascotas_unidad_peso_idx ON personas.mascotas(fid_parametros_unidad_peso);
CREATE INDEX mascotas_talla_idx ON personas.mascotas(fid_parametros_talla);
CREATE INDEX mascotas_estado_reproductivo_idx ON personas.mascotas(fid_parametros_estado_reproductivo);
CREATE INDEX mascotas_temperamento_idx ON personas.mascotas(fid_parametros_temperamento);
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON personas.mascotas
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO configuracion.modulos (
  id_modulos, codigo, nombre, descripcion, icono, ruta, fid_modulos_padre,
  orden, estado, created_by, updated_by
)
SELECT gen_random_uuid(), 'clinic.pets', 'Mascotas',
       'Registra y administra los animales atendidos por la veterinaria.',
       'paw-print', '/clinic/pets', padre.id_modulos, 320, 1,
       'migration', 'migration'
FROM configuracion.modulos padre
WHERE padre.codigo = 'clinic'
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  icono = EXCLUDED.icono,
  ruta = EXCLUDED.ruta,
  fid_modulos_padre = EXCLUDED.fid_modulos_padre,
  orden = EXCLUDED.orden,
  estado = 1,
  updated_by = 'migration';

WITH capacidades(codigo, accion, descripcion) AS (
  VALUES
    ('clinic.pets.read', 'read', 'Mascotas: Ver'),
    ('clinic.pets.create', 'create', 'Mascotas: Crear'),
    ('clinic.pets.update', 'update', 'Mascotas: Actualizar'),
    ('clinic.pets.delete', 'delete', 'Mascotas: Eliminar')
)
INSERT INTO seguridad.permisos (
  id_permisos, fid_modulos, codigo, accion, descripcion, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), modulo.id_modulos, capacidad.codigo,
       capacidad.accion, capacidad.descripcion, 1, 'migration', 'migration'
FROM capacidades capacidad
JOIN configuracion.modulos modulo ON modulo.codigo = 'clinic.pets'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos,
  accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion,
  estado = 1,
  updated_by = 'migration';

INSERT INTO configuracion.planes_modulos (
  id_planes_modulos, fid_planes, fid_modulos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), plan.id_planes, modulo.id_modulos, 1, 'migration', 'migration'
FROM configuracion.planes plan
CROSS JOIN configuracion.modulos modulo
WHERE plan.codigo IN ('BASIC', 'PREMIUM', 'FULL', 'SYSTEM')
  AND modulo.codigo = 'clinic.pets'
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET estado = 1, updated_by = 'migration';

INSERT INTO seguridad.roles_permisos (
  id_roles_permisos, fid_roles, fid_permisos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), rol.id_roles, permiso.id_permisos, 1, 'migration', 'migration'
FROM seguridad.roles rol
CROSS JOIN seguridad.permisos permiso
WHERE rol.codigo IN ('ADMIN', 'SUPERADMIN')
  AND rol.eliminado_en IS NULL
  AND permiso.codigo LIKE 'clinic.pets.%'
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET estado = 1, updated_by = 'migration';
