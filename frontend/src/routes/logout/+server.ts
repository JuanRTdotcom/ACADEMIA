import type { RequestHandler } from "@sveltejs/kit";
import { requestBackend } from "$lib/server/backend";
import { clearSessionCookies } from "$lib/server/session";

/**
 * Logout SSR: Nest revoca la sesión; SvelteKit elimina sus copias de cookies y
 * responde sin contenido. La navegación al login pertenece únicamente al cliente,
 * evitando una redirección HTTP adicional y una carga duplicada de la página.
 */
export const POST: RequestHandler = async (event) => {
  try {
    await requestBackend(event, "/auth/logout", { method: "POST" });
  } catch {
    // Aunque API esté caída, este navegador debe dejar de conservar credenciales.
  } finally {
    clearSessionCookies(event.cookies);
  }

  return new Response(null, { status: 204 });
};
