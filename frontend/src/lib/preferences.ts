import type { Locale } from "$lib/i18n/index.svelte";
import type { ThemeMode } from "$lib/stores/theme.svelte";

/** Cookie legible por SSR y por el script previo al primer pintado. */
export const THEME_COOKIE = "sumaq-theme";
export const THEME_MODE_COOKIE = "sumaq-theme-mode";
export const THEME_STORAGE = "academia-theme";
/** Modo elegido por el usuario: claro/oscuro fijos o "sistema" (sigue al SO). */
export const THEME_MODE_STORAGE = "academia-theme-mode";
export const MENU_STORAGE = "sumaq-menu-collapsed";
export const PREFERENCE_COOKIE_MAX_AGE = 31_536_000;

export interface UserPreferences {
  tema: ThemeMode | null;
  idioma: Locale | null;
  menu_colapsado: boolean;
  fid_admin_level_0: string | null;
  fid_zonas_horarias: string | null;
  zona_horaria: string;
}

export type PreferencePatch = Partial<{
  tema: ThemeMode;
  idioma: Locale;
  menu_colapsado: boolean;
}>;

export function isTheme(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "es";
}
