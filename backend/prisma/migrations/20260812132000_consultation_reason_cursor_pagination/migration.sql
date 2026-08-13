CREATE INDEX motivos_consulta_cursor_idx
ON nucleo.motivos_consulta (
  fid_organizaciones,
  eliminado_en,
  created_at DESC,
  id_motivos_consulta DESC
);
