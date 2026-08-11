CREATE INDEX propietarios_organizacion_eliminado_creado_idx
  ON personas.propietarios (fid_organizaciones, eliminado_en, created_at);
