ALTER TABLE nucleo.perfil_organizacion
  ADD COLUMN ui_tamano_escudo_menu SMALLINT NOT NULL DEFAULT 100;

ALTER TABLE nucleo.perfil_organizacion
  ADD CONSTRAINT perfil_organizacion_ui_tamano_escudo_menu_check
  CHECK (ui_tamano_escudo_menu BETWEEN 50 AND 150);
