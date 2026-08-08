/** Cambio parcial admitido por el caso de uso de preferencias rápidas. */
export interface ComandoActualizarPreferencias {
  tema?: "light" | "dark" | "system";
  idioma?: "es" | "en";
  menu_colapsado?: boolean;
}
