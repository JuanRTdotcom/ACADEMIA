/**
 * Theme store (Svelte 5 runes).
 * Persists to localStorage, syncs the <html data-theme> attribute,
 * syncs changes between tabs and falls back to the OS preference when unset.
 *
 * Dos conceptos:
 *  - `mode`: lo que el usuario eligió — "light", "dark" o "system".
 *  - `current`: el tema concreto aplicado ("light"|"dark"). Cuando el modo es
 *    "system", `current` sigue la preferencia del SO y reacciona a sus cambios.
 * El backend y la cookie solo conocen valores concretos, así que "system" vive
 * en el navegador y siempre resuelve a un `current` concreto para persistir.
 */

import { queuePreference } from "$lib/preferences-client";
import {
  PREFERENCE_COOKIE_MAX_AGE,
  THEME_COOKIE,
  THEME_MODE_COOKIE,
  THEME_MODE_STORAGE,
  THEME_STORAGE,
} from "$lib/preferences";

export type Theme = "light" | "dark";
export type ThemeMode = "light" | "dark" | "system";

function osTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function initial(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_STORAGE) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return osTheme();
}

function readMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const cookie = document.cookie.match(
    /(?:^|;\s*)sumaq-theme-mode=(light|dark|system)(?:;|$)/,
  )?.[1];
  const m = cookie ?? localStorage.getItem(THEME_MODE_STORAGE);
  if (m === "light" || m === "dark" || m === "system") return m;
  // Migración: navegadores que ya tenían un tema fijo (antes de existir el modo)
  // lo conservan como elección explícita, no como "system".
  const legacy = localStorage.getItem(THEME_STORAGE);
  if (legacy === "light" || legacy === "dark") return legacy;
  // Primera visita: coincide con el valor que puede resolver el SSR sin acceso
  // al sistema operativo ni a localStorage.
  return "light";
}

class ThemeStore {
  current = $state<Theme>("light");
  mode = $state<ThemeMode>("system");

  constructor() {
    if (typeof window !== "undefined") {
      this.current =
        (document.documentElement.dataset.theme as Theme) || initial();
      this.mode = readMode();

      // `storage` se dispara en las OTRAS pestañas del mismo origen cuando una
      // cambia localStorage. Aplicamos lo recibido sin volver a escribirlo,
      // evitando eventos redundantes o bucles entre pestañas.
      window.addEventListener("storage", (event) => {
        if (
          event.key === THEME_STORAGE &&
          (event.newValue === "light" || event.newValue === "dark")
        ) {
          this.#sync(event.newValue);
        }
        if (event.key === THEME_MODE_STORAGE) {
          this.mode = readMode();
        }
      });

      // Cuando el modo es "system", seguimos los cambios del SO en vivo.
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
          if (this.mode === "system") this.#apply(osTheme(), false);
        });
    }
  }

  /** Actualiza el estado reactivo y el atributo que controla los estilos. */
  #sync(theme: Theme) {
    this.current = theme;
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
  }

  /** Aplica el tema concreto y, si nació de una acción, encola el guardado remoto. */
  #apply(theme: Theme, remote: boolean) {
    this.#sync(theme);
    if (typeof document !== "undefined") {
      localStorage.setItem(THEME_STORAGE, theme);
      document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
    }
    if (remote) queuePreference({ tema: theme });
  }

  /** Persiste el modo elegido y resuelve el tema concreto correspondiente. */
  setMode(mode: ThemeMode) {
    this.mode = mode;
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_MODE_STORAGE, mode);
      document.cookie = `${THEME_MODE_COOKIE}=${mode}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
    }
    this.#apply(mode === "system" ? osTheme() : mode, false);
    queuePreference({ tema: mode });
  }

  /** Alterna claro/oscuro de forma explícita (fija el modo). */
  toggle() {
    this.setMode(this.current === "dark" ? "light" : "dark");
  }

  set(theme: Theme) {
    this.setMode(theme);
  }

  /** Prepara el estado que consumirán los hijos durante SSR, antes de renderizarlos. */
  prepare(mode: ThemeMode) {
    this.mode = mode;
    if (mode !== "system") this.#sync(mode);
  }

  /** Preferencia llegada del servidor: alinea navegador sin repetir el PATCH. */
  hydrate(mode: ThemeMode) {
    this.mode = mode;
    if (typeof document !== "undefined") {
      localStorage.setItem(THEME_MODE_STORAGE, mode);
      document.cookie = `${THEME_MODE_COOKIE}=${mode}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
    }
    this.#apply(mode === "system" ? osTheme() : mode, false);
  }
}

export const theme = new ThemeStore();
