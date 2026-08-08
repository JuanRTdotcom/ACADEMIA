import type { Cookies } from "@sveltejs/kit";
import { serverConfig } from "./config";

// Nombre de la cookie de refresh que marca una sesión activa (la emite el backend).
// Fuente única: backend.ts también la usa al copiar las cookies de login.
export const sessionCookieName = serverConfig.refreshCookieName;

/**
 * Indica si la petición trae una cookie de sesión.
 *
 * Solo comprueba presencia, no validez: sirve para enrutar en SSR (login vs
 * dashboard). La seguridad real la sigue imponiendo el backend en cada llamada;
 * si el token está caducado/inválido, las peticiones a la API responderán 401.
 */
export function hasSession(cookies: Cookies): boolean {
  return Boolean(cookies.get(sessionCookieName));
}

/** Borra ambas cookies locales después de llamar al logout del backend. */
export function clearSessionCookies(cookies: Cookies): void {
  cookies.delete("access_token", { path: "/" });
  cookies.delete(sessionCookieName, { path: "/" });
}
