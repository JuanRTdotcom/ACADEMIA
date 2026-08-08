CREATE TABLE configuracion.seguros_maestro (
  id_seguros_maestro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(80) NOT NULL UNIQUE,
  nombre VARCHAR(160) NOT NULL,
  permite_otro BOOLEAN NOT NULL DEFAULT FALSE,
  orden INTEGER NOT NULL DEFAULT 0,
  estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  CONSTRAINT seguros_maestro_estado_valido CHECK (estado IN (0, 1))
);

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON configuracion.seguros_maestro
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO configuracion.seguros_maestro (codigo, nombre, permite_otro, orden) VALUES
  ('seguro_integral_de_salud_sis', 'Seguro Integral de Salud (SIS)', FALSE, 1),
  ('seguro_social_de_salud_essalud', 'Seguro Social de Salud (EsSalud)', FALSE, 2),
  ('fondo_de_salud_de_la_marina_fosmar', 'Fondo de Salud de la Marina (FOSMAR)', FALSE, 3),
  ('fondo_de_salud_de_la_fuerza_aerea_fosfap', 'Fondo de Salud de la Fuerza Aérea (FOSFAP)', FALSE, 4),
  ('fondo_de_salud_del_ejercito_fosoli', 'Fondo de Salud del Ejército (FOSOLI)', FALSE, 5),
  ('fondo_de_aseguramiento_en_salud_de_la_policia_nacional_saludpol', 'Fondo de Aseguramiento en Salud de la Policía Nacional (SALUDPOL)', FALSE, 6),
  ('pacifico_s_a_entidad_prestadora_de_salud', 'Pacífico S.A. Entidad Prestadora de Salud', FALSE, 7),
  ('rimac_s_a_entidad_prestadora_de_salud', 'Rímac S.A. Entidad Prestadora de Salud', FALSE, 8),
  ('mapfre_peru_s_a_entidad_prestadora_de_salud', 'Mapfre Perú S.A. Entidad Prestadora de Salud', FALSE, 9),
  ('la_positiva_s_a_entidad_prestadora_de_salud', 'La Positiva S.A. Entidad Prestadora de Salud', FALSE, 10),
  ('rimac_seguros_y_reaseguros', 'Rímac Seguros y Reaseguros', FALSE, 11),
  ('pacifico_compania_de_seguros_y_reaseguros', 'Pacífico Compañía de Seguros y Reaseguros', FALSE, 12),
  ('mapfre_peru_compania_de_seguros_y_reaseguros', 'Mapfre Perú Compañía de Seguros y Reaseguros', FALSE, 13),
  ('la_positiva_seguros_y_reaseguros', 'La Positiva Seguros y Reaseguros', FALSE, 14),
  ('interseguro_compania_de_seguros', 'Interseguro Compañía de Seguros', FALSE, 15),
  ('chubb_peru_s_a', 'Chubb Perú S.A.', FALSE, 16),
  ('protecta_s_a_compania_de_seguros_protecta_security', 'Protecta S.A. Compañía de Seguros (Protecta Security)', FALSE, 17),
  ('bnp_paribas_cardif_peru', 'BNP Paribas Cardif Perú', FALSE, 18),
  ('crecer_seguros_s_a', 'Crecer Seguros S.A.', FALSE, 19),
  ('vivir_seguros_compania_de_seguros', 'Vivir Seguros Compañía de Seguros', FALSE, 20),
  ('qualitas_compania_de_seguros_peru', 'Quálitas Compañía de Seguros (Perú)', FALSE, 21),
  ('oncosalud_auna', 'Oncosalud (Auna)', FALSE, 22),
  ('secrex_compania_de_seguros_de_credito_y_garantias_cesce_peru', 'Secrex Compañía de Seguros de Crédito y Garantías (CESCE Perú)', FALSE, 23),
  ('insur_compania_de_seguros', 'Insur Compañía de Seguros', FALSE, 24),
  ('otro', 'Otros', TRUE, 25);

ALTER TABLE personas.personas_seguros
  ADD COLUMN fid_seguros_maestro UUID,
  ADD COLUMN nombre_otro VARCHAR(120);

UPDATE personas.personas_seguros
SET fid_seguros_maestro = (
      SELECT id_seguros_maestro
      FROM configuracion.seguros_maestro
      WHERE codigo = 'otro'
    ),
    nombre_otro = compania;

ALTER TABLE personas.personas_seguros
  ALTER COLUMN fid_seguros_maestro SET NOT NULL,
  DROP COLUMN compania,
  ADD CONSTRAINT personas_seguros_seguro_fkey
    FOREIGN KEY (fid_seguros_maestro)
    REFERENCES configuracion.seguros_maestro(id_seguros_maestro)
    ON DELETE RESTRICT,
  ADD CONSTRAINT personas_seguros_estado_valido CHECK (estado IN (0, 1)),
  ADD CONSTRAINT personas_seguros_nombre_otro_valido CHECK (
    nombre_otro IS NULL OR char_length(btrim(nombre_otro)) BETWEEN 2 AND 120
  ),
  ADD CONSTRAINT personas_seguros_numero_valido CHECK (
    char_length(btrim(numero_seguro)) BETWEEN 1 AND 80
  );

CREATE INDEX personas_seguros_maestro_idx
ON personas.personas_seguros(fid_seguros_maestro);

CREATE UNIQUE INDEX personas_seguros_identidad_activa_uidx
ON personas.personas_seguros (
  fid_personas,
  fid_seguros_maestro,
  lower(COALESCE(nombre_otro, '')),
  lower(numero_seguro)
)
WHERE estado = 1;

INSERT INTO eventos.eventos_maestro
  (id_eventos_maestro, codigo, tipo_agregado, nombre, descripcion, version, visible_actividad, estado)
VALUES
  (gen_random_uuid(), 'perfil.seguro.agregado', 'personas_seguros', 'Seguro agregado', 'El usuario agregó un seguro a su perfil.', 1, TRUE, 1),
  (gen_random_uuid(), 'perfil.seguro.modificado', 'personas_seguros', 'Seguro modificado', 'El usuario modificó un seguro de su perfil.', 1, TRUE, 1),
  (gen_random_uuid(), 'perfil.seguro.eliminado', 'personas_seguros', 'Seguro eliminado', 'El usuario eliminó un seguro de su perfil.', 1, TRUE, 1)
ON CONFLICT (codigo, version) DO UPDATE
SET tipo_agregado = EXCLUDED.tipo_agregado,
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    visible_actividad = EXCLUDED.visible_actividad,
    estado = EXCLUDED.estado;
