-- PostgreSQL mantiene los maestros; la aplicación nunca contiene estas listas.
INSERT INTO configuracion.parametros
  (id_parametros, codigo_grupo, codigo, etiqueta, orden, estado)
VALUES
  (gen_random_uuid(), 'tipos_documento', 'dni', 'DNI', 10, 1),
  (gen_random_uuid(), 'tipos_documento', 'carnet_extranjeria', 'Carnet de extranjería', 20, 1),
  (gen_random_uuid(), 'tipos_documento', 'pasaporte', 'Pasaporte', 30, 1),
  (gen_random_uuid(), 'tipos_documento', 'cedula', 'Cédula', 40, 1),
  (gen_random_uuid(), 'tipos_documento', 'permiso_permanencia_temporal', 'Permiso de permanencia temporal', 50, 1),
  (gen_random_uuid(), 'tipos_documento', 'sin_documento', 'Sin documento', 60, 1),
  (gen_random_uuid(), 'tipos_telefono', 'movil', 'Móvil', 10, 1),
  (gen_random_uuid(), 'tipos_telefono', 'fijo', 'Fijo', 20, 1),
  (gen_random_uuid(), 'tipos_telefono', 'trabajo', 'Trabajo', 30, 1),
  (gen_random_uuid(), 'tipos_telefono', 'otro', 'Otro', 40, 1)
ON CONFLICT (codigo_grupo, codigo) DO UPDATE
SET etiqueta = EXCLUDED.etiqueta,
    orden = EXCLUDED.orden;

-- Documento: tenant explícito, baja lógica reutilizable y unicidad institucional.
ALTER TABLE personas.personas_documentos
  ADD COLUMN fid_organizaciones UUID;

UPDATE personas.personas_documentos AS documento
SET fid_organizaciones = persona.fid_organizaciones
FROM personas.personas AS persona
WHERE persona.id_personas = documento.fid_personas;

ALTER TABLE personas.personas_documentos
  ALTER COLUMN fid_organizaciones SET NOT NULL,
  DROP CONSTRAINT personas_documentos_persona_fkey,
  DROP CONSTRAINT personas_documentos_unicos,
  ADD CONSTRAINT personas_documentos_persona_organizacion_fkey
    FOREIGN KEY (fid_personas, fid_organizaciones)
    REFERENCES personas.personas(id_personas, fid_organizaciones)
    ON DELETE CASCADE,
  ADD CONSTRAINT personas_documentos_estado_valido CHECK (estado IN (0, 1)),
  ADD CONSTRAINT personas_documentos_numero_valido CHECK (
    numero_documento ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,39}$'
  );

CREATE INDEX personas_documentos_organizacion_idx
ON personas.personas_documentos(fid_organizaciones);

CREATE INDEX personas_documentos_tipo_idx
ON personas.personas_documentos(codigo_tipo_documento);

CREATE UNIQUE INDEX personas_documentos_identidad_activa_uidx
ON personas.personas_documentos (
  fid_organizaciones,
  codigo_tipo_documento,
  upper(numero_documento)
)
WHERE estado = 1;

-- Teléfonos: mismo número lógico no puede repetirse para una persona activa.
ALTER TABLE personas.personas_telefonos
  DROP CONSTRAINT personas_telefonos_numero_unico,
  ADD CONSTRAINT personas_telefonos_estado_valido CHECK (estado IN (0, 1)),
  ADD CONSTRAINT personas_telefonos_numero_valido CHECK (
    numero ~ '^\+?[0-9][0-9 ()\.-]{5,29}$'
  ),
  ADD CONSTRAINT personas_telefonos_titular_valido CHECK (
    char_length(btrim(titular)) BETWEEN 2 AND 120
  );

CREATE INDEX personas_telefonos_tipo_idx
ON personas.personas_telefonos(codigo_tipo_telefono);

CREATE UNIQUE INDEX personas_telefonos_numero_activo_uidx
ON personas.personas_telefonos (
  fid_personas,
  regexp_replace(numero, '[^0-9]', '', 'g')
)
WHERE estado = 1;

DROP TRIGGER IF EXISTS establecer_updated_at ON personas.personas_documentos;
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON personas.personas_documentos
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

DROP TRIGGER IF EXISTS establecer_updated_at ON personas.personas_telefonos;
CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON personas.personas_telefonos
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO eventos.eventos_maestro
  (id_eventos_maestro, codigo, tipo_agregado, nombre, descripcion, version, visible_actividad, estado)
VALUES
  (gen_random_uuid(), 'perfil.documento.agregado', 'personas_documentos', 'Documento agregado', 'El usuario agregó un documento a su perfil.', 1, TRUE, 1),
  (gen_random_uuid(), 'perfil.documento.eliminado', 'personas_documentos', 'Documento eliminado', 'El usuario eliminó un documento de su perfil.', 1, TRUE, 1),
  (gen_random_uuid(), 'perfil.telefono.agregado', 'personas_telefonos', 'Teléfono agregado', 'El usuario agregó un teléfono a su perfil.', 1, TRUE, 1),
  (gen_random_uuid(), 'perfil.telefono.modificado', 'personas_telefonos', 'Teléfono modificado', 'El usuario modificó un teléfono de su perfil.', 1, TRUE, 1),
  (gen_random_uuid(), 'perfil.telefono.eliminado', 'personas_telefonos', 'Teléfono eliminado', 'El usuario eliminó un teléfono de su perfil.', 1, TRUE, 1)
ON CONFLICT (codigo, version) DO UPDATE
SET tipo_agregado = EXCLUDED.tipo_agregado,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    visible_actividad = EXCLUDED.visible_actividad,
    estado = EXCLUDED.estado;
