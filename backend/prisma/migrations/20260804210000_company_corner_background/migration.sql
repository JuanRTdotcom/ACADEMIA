ALTER TABLE nucleo.perfil_organizacion
  ADD COLUMN ui_esquinero_fondo_activo BOOLEAN NOT NULL DEFAULT FALSE;

-- Conserva activas las configuraciones que ya tenían un esquinero realmente
-- personalizado; blanco/negro predeterminados continúan como fondo normal.
UPDATE nucleo.perfil_organizacion
SET ui_esquinero_fondo_activo = TRUE
WHERE
  COALESCE(UPPER(ui_esquinero_claro), '') NOT IN ('', '#FFFFFF')
  OR COALESCE(UPPER(ui_esquinero_oscuro), '') NOT IN ('', '#1E1E1D');
