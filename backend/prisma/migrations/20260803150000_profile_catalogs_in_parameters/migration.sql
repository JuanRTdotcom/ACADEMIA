-- Seguros: migra el catálogo dedicado al maestro compartido de parámetros.
INSERT INTO configuracion.parametros
  (id_parametros, codigo_grupo, codigo, etiqueta, orden, estado)
SELECT
  gen_random_uuid(),
  'seguros',
  codigo,
  nombre,
  orden * 10,
  estado
FROM configuracion.seguros_maestro
ON CONFLICT (codigo_grupo, codigo) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta,
    orden = EXCLUDED.orden,
    estado = EXCLUDED.estado;

DROP INDEX IF EXISTS personas.personas_seguros_identidad_activa_uidx;
DROP INDEX IF EXISTS personas.personas_seguros_maestro_idx;

ALTER TABLE personas.personas_seguros
  ADD COLUMN codigo_seguro VARCHAR(80);

UPDATE personas.personas_seguros AS ps
SET codigo_seguro = sm.codigo
FROM configuracion.seguros_maestro AS sm
WHERE sm.id_seguros_maestro = ps.fid_seguros_maestro;

ALTER TABLE personas.personas_seguros
  DROP CONSTRAINT personas_seguros_seguro_fkey,
  ALTER COLUMN codigo_seguro SET NOT NULL,
  DROP COLUMN fid_seguros_maestro;

DROP TABLE configuracion.seguros_maestro;

CREATE INDEX personas_seguros_codigo_idx
ON personas.personas_seguros(codigo_seguro);

CREATE UNIQUE INDEX personas_seguros_identidad_activa_uidx
ON personas.personas_seguros (
  fid_personas,
  codigo_seguro,
  lower(COALESCE(nombre_otro, '')),
  lower(numero_seguro)
)
WHERE estado = 1;

-- Hobbies: conserva códigos de parámetros en lugar de copiar etiquetas.
ALTER TABLE personas.personas_hobbies
  ADD COLUMN codigo_hobby VARCHAR(80),
  ADD COLUMN hobby_personalizado VARCHAR(100);

UPDATE personas.personas_hobbies AS ph
SET codigo_hobby = p.codigo
FROM configuracion.parametros AS p
WHERE p.codigo_grupo = 'hobbies'
  AND lower(p.etiqueta) = lower(ph.hobby);

UPDATE personas.personas_hobbies
SET codigo_hobby = 'otros',
    hobby_personalizado = hobby
WHERE codigo_hobby IS NULL;

ALTER TABLE personas.personas_hobbies
  DROP CONSTRAINT personas_hobbies_unicos,
  ALTER COLUMN codigo_hobby SET NOT NULL,
  DROP COLUMN hobby,
  ADD CONSTRAINT personas_hobbies_estado_valido CHECK (estado IN (0, 1)),
  ADD CONSTRAINT personas_hobbies_personalizado_valido CHECK (
    hobby_personalizado IS NULL
    OR char_length(btrim(hobby_personalizado)) BETWEEN 2 AND 100
  );

CREATE INDEX personas_hobbies_codigo_idx
ON personas.personas_hobbies(codigo_hobby);

CREATE INDEX personas_hobbies_frecuencia_idx
ON personas.personas_hobbies(codigo_frecuencia);

CREATE UNIQUE INDEX personas_hobbies_identidad_activa_uidx
ON personas.personas_hobbies (
  fid_personas,
  codigo_hobby,
  lower(COALESCE(hobby_personalizado, ''))
)
WHERE estado = 1;

INSERT INTO eventos.eventos_maestro
  (id_eventos_maestro, codigo, tipo_agregado, nombre, descripcion, version, visible_actividad, estado)
VALUES
  (gen_random_uuid(), 'perfil.hobby.modificado', 'personas_hobbies', 'Hobby modificado', 'El usuario modificó un hobby de su perfil.', 1, TRUE, 1)
ON CONFLICT (codigo, version) DO UPDATE
SET tipo_agregado = EXCLUDED.tipo_agregado,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    visible_actividad = EXCLUDED.visible_actividad,
    estado = EXCLUDED.estado;
