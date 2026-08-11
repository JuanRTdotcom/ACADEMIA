import { error, redirect } from "@sveltejs/kit";
import { canAccessRoute, requiredPermission } from "$lib/config/access";
import {
  requestBackend,
  copyAuthCookieValues,
  refreshBackendSession,
} from "$lib/server/backend";
import { clearSessionCookies } from "$lib/server/session";
import {
  applyPreferenceCookies,
  parseUserContext,
  type UserContext,
} from "$lib/server/user-context";
import type { LayoutServerLoad } from "./$types";

async function readContext(response: Response): Promise<UserContext> {
  return parseUserContext(await response.json());
}

/**
 * Obtiene contexto vigente. Si el access expiró, rota refresh y repite /auth/me
 * usando las cookies nuevas; ninguna página continúa con contexto incompleto.
 */
async function loadCurrentUser(
  event: Parameters<LayoutServerLoad>[0],
): Promise<UserContext> {
  let response = await requestBackend(event, "/auth/me");
  if (response.ok) return readContext(response);

  if (response.status === 401) {
    const refreshed = await refreshBackendSession(event);
    if (refreshed.ok) {
      copyAuthCookieValues(
        refreshed.cookies,
        event.cookies,
        event.url.protocol === "https:",
      );
      response = await requestBackend(event, "/auth/me");
      if (response.ok) return readContext(response);
    }
  }

  clearSessionCookies(event.cookies);
  redirect(303, "/login");
}

/**
 * Este layout corre en SSR para cada ruta de la aplicación. Carga identidad,
 * organización, roles, permisos y preferencias antes de renderizar, y aplica una
 * política fail-closed: una página nueva debe declarar su permiso en config/access.
 */
export const load: LayoutServerLoad = async (event) => {
  if (!event.locals.isAuthenticated) redirect(303, "/login");

  const usuario = await loadCurrentUser(event);
  const permitidoPorModulo = canAccessRoute(event.url.pathname, usuario.modulos);
  const requerido = requiredPermission(event.url.pathname);
  if (!permitidoPorModulo && requerido === undefined) error(403, "auth.noPermission");
  if (
    !permitidoPorModulo &&
    requerido !== undefined &&
    requerido !== null &&
    !usuario.permisos.includes(requerido)
  ) {
    error(403, "auth.noPermission");
  }

  applyPreferenceCookies(event.cookies, event.url, usuario.preferencias);
  return { usuario };
};
