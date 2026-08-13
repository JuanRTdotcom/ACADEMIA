CREATE INDEX servicios_veterinaria_cursor_idx
ON nucleo.servicios_veterinaria (
  fid_organizaciones,
  eliminado_en,
  created_at DESC,
  id_servicios_veterinaria DESC
);
