ALTER TABLE personas.propietarios
  ALTER COLUMN celular DROP NOT NULL,
  ALTER COLUMN direccion DROP NOT NULL,
  ALTER COLUMN fid_admin_level_0 DROP NOT NULL,
  ALTER COLUMN fid_admin_level_3 DROP NOT NULL,
  ALTER COLUMN fid_parametros_como_conocio DROP NOT NULL;

ALTER TABLE personas.mascotas
  ALTER COLUMN fid_parametros_color DROP NOT NULL,
  ALTER COLUMN fecha_nacimiento DROP NOT NULL,
  ALTER COLUMN peso DROP NOT NULL,
  ALTER COLUMN fid_parametros_unidad_peso DROP NOT NULL,
  ALTER COLUMN fid_parametros_talla DROP NOT NULL,
  ALTER COLUMN fid_parametros_estado_reproductivo DROP NOT NULL,
  ALTER COLUMN fid_parametros_temperamento DROP NOT NULL;

CREATE INDEX mascotas_organizacion_eliminado_creado_idx
  ON personas.mascotas (fid_organizaciones, eliminado_en, created_at);
