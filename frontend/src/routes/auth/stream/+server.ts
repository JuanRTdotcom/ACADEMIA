import { requestBackend } from "$lib/server/backend";
import type { RequestHandler } from "./$types";

/**
 * Proxy del stream SSE de Nest. El navegador (EventSource) se conecta a este mismo
 * origen —donde viven las cookies de sesión— y SvelteKit reenvía la conexión a Nest
 * con esas cookies. Se devuelve el cuerpo como stream, sin bufferizar, para que los
 * eventos lleguen en tiempo real.
 */
export const GET: RequestHandler = async (event) => {
  const upstream = await requestBackend(event, "/auth/events");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
};
