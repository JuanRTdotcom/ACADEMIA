export interface CompanyAppearancePreview {
  color_primario: string | null;
  cabecera_claro: string | null;
  cabecera_oscuro: string | null;
  esquinero_claro: string | null;
  esquinero_oscuro: string | null;
  menu_claro: string | null;
  menu_oscuro: string | null;
  mostrar_escudo_menu: boolean;
  mostrar_nombre_empresa_menu: boolean;
  ocultar_esquinero_expandido: boolean;
  esquinero_fondo_activo: boolean;
	cabecera_ocultar_borde: boolean;
	menu_ocultar_borde: boolean;
	tamano_escudo_menu: number;
}

class AppearancePreviewStore {
  value = $state<CompanyAppearancePreview | null>(null);

  show(value: CompanyAppearancePreview) {
    this.value = { ...value };
  }

  clear() {
    this.value = null;
  }
}

/** Vista temporal local: nunca escribe en API ni PostgreSQL. */
export const companyAppearancePreview = new AppearancePreviewStore();
