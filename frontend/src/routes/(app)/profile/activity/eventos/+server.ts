import { json } from "@sveltejs/kit";
import { requestBackend } from "$lib/server/backend";
import type { RequestHandler } from "./$types";

/** Proxy same-origin para el scroll infinito de actividad: añade cookies de
 *  sesión, tenant e idioma. Devuelve una página de eventos ya validada por Nest. */
export const GET: RequestHandler = async (event) => {
  if (!event.locals.isAuthenticated) {
    return json({ ok: false }, { status: 401 });
  }

  const solicitada = Number(event.url.searchParams.get("pagina") ?? "1");
  const pagina =
    Number.isInteger(solicitada) && solicitada >= 1 && solicitada <= 10_000
      ? solicitada
      : 1;

  const response = await requestBackend(
    event,
    `/profile/activity?pagina=${pagina}&limite=20`,
  );

  if (!response.ok) {
    return json({ ok: false }, { status: response.status });
  }

  const actividad = await response.json();
  return json(actividad, { status: 200 });
};
