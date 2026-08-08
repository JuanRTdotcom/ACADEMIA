ALTER TABLE nucleo.perfil_organizacion
  DROP CONSTRAINT perfil_organizacion_ui_tamano_escudo_menu_check;

ALTER TABLE nucleo.perfil_organizacion
  ADD CONSTRAINT perfil_organizacion_ui_tamano_escudo_menu_check
  CHECK (ui_tamano_escudo_menu BETWEEN 50 AND 200);
