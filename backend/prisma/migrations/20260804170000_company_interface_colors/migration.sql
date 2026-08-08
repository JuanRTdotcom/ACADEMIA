ALTER TABLE nucleo.perfil_organizacion
  ADD COLUMN ui_cabecera_claro VARCHAR(7),
  ADD COLUMN ui_cabecera_oscuro VARCHAR(7),
  ADD COLUMN ui_esquinero_claro VARCHAR(7),
  ADD COLUMN ui_esquinero_oscuro VARCHAR(7),
  ADD COLUMN ui_menu_claro VARCHAR(7),
  ADD COLUMN ui_menu_oscuro VARCHAR(7),
  ADD COLUMN ui_mostrar_escudo_menu BOOLEAN NOT NULL DEFAULT FALSE;

-- Conserva el comportamiento institucional que ya estaba activo en el menú.
UPDATE nucleo.perfil_organizacion
SET
  ui_menu_claro = color_primario,
  ui_menu_oscuro = color_primario
WHERE color_primario ~ '^#[0-9A-Fa-f]{6}$';

ALTER TABLE nucleo.perfil_organizacion
  ADD CONSTRAINT perfil_organizacion_ui_cabecera_claro_hex
    CHECK (ui_cabecera_claro IS NULL OR ui_cabecera_claro ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT perfil_organizacion_ui_cabecera_oscuro_hex
    CHECK (ui_cabecera_oscuro IS NULL OR ui_cabecera_oscuro ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT perfil_organizacion_ui_esquinero_claro_hex
    CHECK (ui_esquinero_claro IS NULL OR ui_esquinero_claro ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT perfil_organizacion_ui_esquinero_oscuro_hex
    CHECK (ui_esquinero_oscuro IS NULL OR ui_esquinero_oscuro ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT perfil_organizacion_ui_menu_claro_hex
    CHECK (ui_menu_claro IS NULL OR ui_menu_claro ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT perfil_organizacion_ui_menu_oscuro_hex
    CHECK (ui_menu_oscuro IS NULL OR ui_menu_oscuro ~ '^#[0-9A-Fa-f]{6}$');
