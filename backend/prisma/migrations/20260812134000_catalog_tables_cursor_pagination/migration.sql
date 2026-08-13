CREATE INDEX IF NOT EXISTS tipos_hospitalizacion_cursor_idx
  ON nucleo.tipos_hospitalizacion (fid_organizaciones, eliminado_en, created_at DESC, id_tipos_hospitalizacion DESC);
CREATE INDEX IF NOT EXISTS procedimientos_veterinarios_cursor_idx
  ON nucleo.procedimientos_veterinarios (fid_organizaciones, eliminado_en, created_at DESC, id_procedimientos_veterinarios DESC);
CREATE INDEX IF NOT EXISTS pruebas_laboratorio_cursor_idx
  ON nucleo.pruebas_laboratorio (fid_organizaciones, eliminado_en, created_at DESC, id_pruebas_laboratorio DESC);
CREATE INDEX IF NOT EXISTS estudios_diagnosticos_cursor_idx
  ON nucleo.estudios_diagnosticos (fid_organizaciones, eliminado_en, created_at DESC, id_estudios_diagnosticos DESC);
CREATE INDEX IF NOT EXISTS servicios_peluqueria_spa_cursor_idx
  ON nucleo.servicios_peluqueria_spa (fid_organizaciones, eliminado_en, created_at DESC, id_servicios_peluqueria_spa DESC);
CREATE INDEX IF NOT EXISTS usuarios_empresa_cursor_idx
  ON seguridad.usuarios (fid_organizaciones, eliminado_en, created_at DESC, id_usuarios DESC);
