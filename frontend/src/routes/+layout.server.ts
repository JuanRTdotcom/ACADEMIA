import { error, redirect } from "@sveltejs/kit";
import { COOKIE } from "$lib/i18n/index.svelte";
import { PREFERENCE_COOKIE_MAX_AGE } from "$lib/preferences";
import { THEME_COOKIE } from "$lib/preferences";
import { serverConfig } from "$lib/server/config";
import { tenantRegistrado } from "$lib/server/tenant";
import type { LayoutServerLoad } from "./$types";

/**
 * Corre para toda ruta (layout raíz). Bloquea subdominios no registrados y pasa el
 * idioma resuelto (cookie) para render idéntico en SSR y cliente.
 */
export const load: LayoutServerLoad = async (event) => {
  const tenant = await tenantRegistrado(event);
  if (!tenant) {
    if (serverConfig.tenantNotFoundUrl) {
      redirect(307, serverConfig.tenantNotFoundUrl);
    }
    error(404, "tenant.notFound");
  }

  const localeGuardado = event.cookies.get(COOKIE);
  // Una elección previa del navegador/usuario tiene prioridad. En la primera
  // visita, el SSR usa el idioma configurado por la empresa, no un fallback global.
  const locale =
    localeGuardado === "es" || localeGuardado === "en"
      ? localeGuardado
      : tenant.region.idioma_por_defecto;
  const storedTheme = event.cookies.get(THEME_COOKIE);
  const resolvedTheme: "light" | "dark" =
    storedTheme === "dark" ? "dark" : "light";

  // Esta preferencia no es sensible. La renovamos explícitamente como una cookie
  // legible por el navegador para que el selector del login pueda modificarla.
  // Así el siguiente request SSR conoce el idioma antes de renderizar la página.
  event.cookies.set(COOKIE, locale, {
    path: "/",
    maxAge: PREFERENCE_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: event.url.protocol === "https:",
    httpOnly: false,
  });

  return {
    locale,
    isAuthenticated: event.locals.isAuthenticated,
    tenant,
    resolvedTheme,
  };
};
