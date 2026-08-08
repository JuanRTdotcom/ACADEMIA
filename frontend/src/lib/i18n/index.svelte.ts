import en from "./en.json";
import es from "./es.json";
import { queuePreference } from "$lib/preferences-client";
import { PREFERENCE_COOKIE_MAX_AGE } from "$lib/preferences";

export type Locale = "en" | "es";

/** Diccionarios cargados desde archivos. Agregar un idioma = agregar un JSON aquí. */
const dictionaries: Record<Locale, Record<string, string>> = { en, es };

export const locales: Locale[] = ["en", "es"];
export const FALLBACK: Locale = "en"; // default: inglés
export const COOKIE = "sumaq-locale";
const STORAGE_KEY = "sumaq-locale-sync";

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "es" ? "es" : FALLBACK;
}

class I18n {
  // Lo fija el layout raíz desde los datos del servidor (SSR), así no hay salto.
  locale = $state<Locale>(FALLBACK);

  constructor() {
    if (typeof window !== "undefined") {
      // La cookie se comparte entre pestañas, pero no genera eventos. Esta señal
      // en localStorage notifica a las OTRAS pestañas para actualizar su UI abierta.
      window.addEventListener("storage", (event) => {
        if (
          event.key === STORAGE_KEY &&
          (event.newValue === "en" || event.newValue === "es")
        ) {
          this.#sync(event.newValue);
        }
      });
    }
  }

  /** Actualiza el estado reactivo y el atributo lang sin volver a emitir eventos. */
  #sync(locale: Locale) {
    this.locale = locale;
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }

  set(locale: Locale) {
    this.#apply(locale, true);
  }

  /** Preferencia llegada del servidor: sincroniza el navegador sin repetir el PATCH. */
  hydrate(locale: Locale) {
    this.#apply(locale, false);
  }

  /** Aplica localmente y opcionalmente encola la persistencia en la cuenta. */
  #apply(locale: Locale, remote: boolean) {
    this.#sync(locale);
    if (typeof document !== "undefined") {
      // Cookie → la lee el servidor en la próxima carga (SSR sin parpadeo).
      document.cookie = `${COOKIE}=${locale}; path=/; max-age=${PREFERENCE_COOKIE_MAX_AGE}; samesite=lax`;
      // Señal reactiva para las demás pestañas del mismo navegador y origen.
      localStorage.setItem(STORAGE_KEY, locale);
    }
    if (remote) queuePreference({ idioma: locale });
  }

  /** Traduce una clave. Soporta {param} y \n. Cae al inglés y luego a la clave. */
  t(key: string, params?: Record<string, string | number>): string {
    let text =
      dictionaries[this.locale][key] ?? dictionaries[FALLBACK][key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  }
}

export const i18n = new I18n();
