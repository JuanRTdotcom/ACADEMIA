-- La identidad visual pertenece a la veterinaria y se administra desde su sede principal.
-- Las sedes existentes se alinean sin tocar su configuración operativa ni fiscal.
UPDATE nucleo.sedes AS secundaria
SET escudo_url = principal.escudo_url,
    escudo_oscuro_url = principal.escudo_oscuro_url,
    escudo_misma_imagen = principal.escudo_misma_imagen,
    imagotipo_url = principal.imagotipo_url,
    imagotipo_oscuro_url = principal.imagotipo_oscuro_url,
    imagotipo_misma_imagen = principal.imagotipo_misma_imagen,
    color_primario = principal.color_primario,
    ui_cabecera_claro = principal.ui_cabecera_claro,
    ui_cabecera_oscuro = principal.ui_cabecera_oscuro,
    ui_esquinero_claro = principal.ui_esquinero_claro,
    ui_esquinero_oscuro = principal.ui_esquinero_oscuro,
    ui_menu_claro = principal.ui_menu_claro,
    ui_menu_oscuro = principal.ui_menu_oscuro,
    ui_mostrar_escudo_menu = principal.ui_mostrar_escudo_menu,
    ui_mostrar_nombre_empresa_menu = principal.ui_mostrar_nombre_empresa_menu,
    ui_ocultar_esquinero_expandido = principal.ui_ocultar_esquinero_expandido,
    ui_esquinero_fondo_activo = principal.ui_esquinero_fondo_activo,
    ui_cabecera_ocultar_borde = principal.ui_cabecera_ocultar_borde,
    ui_menu_ocultar_borde = principal.ui_menu_ocultar_borde,
    ui_tamano_escudo_menu = principal.ui_tamano_escudo_menu,
    updated_at = now()
FROM nucleo.sedes AS principal
WHERE principal.fid_organizaciones = secundaria.fid_organizaciones
  AND principal.es_principal = true
  AND principal.estado = 1
  AND principal.eliminado_en IS NULL
  AND secundaria.es_principal = false
  AND secundaria.estado = 1
  AND secundaria.eliminado_en IS NULL;
