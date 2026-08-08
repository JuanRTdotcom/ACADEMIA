import { json } from "@sveltejs/kit";
import { requestBackend } from "$lib/server/backend";
import type { RequestHandler } from "./$types";

/** Proxy same-origin: añade cookies de sesión, tenant, idioma y protección CSRF. */
export const PATCH: RequestHandler = async (event) => {
  if (!event.locals.isAuthenticated) {
    return json({ ok: false }, { status: 401 });
  }

  const body = await event.request.text();
  const response = await requestBackend(event, "/preferences", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
  });
  const resultado = await response.json().catch(() => ({ ok: false }));

  return json(resultado, { status: response.status });
};
