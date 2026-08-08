import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requestBackend } from "$lib/server/backend";

/** Añade uid httpOnly y reenvía metadatos del cliente autenticado a Nest. */
export const POST: RequestHandler = async (event) => {
  const datos = await event.request.json().catch(() => null);
  const uid_dispositivo = event.cookies.get("device_id");
  if (!datos || !uid_dispositivo) {
    return json({ actualizado: false }, { status: 400 });
  }

  const response = await requestBackend(event, "/devices/client-info", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...datos, uid_dispositivo }),
  });
  const resultado = await response.json().catch(() => ({ actualizado: false }));
  const correcto = response.ok && resultado.actualizado === true;
  return json(resultado, { status: correcto ? 200 : 502 });
};
