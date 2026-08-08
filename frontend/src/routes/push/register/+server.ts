import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requestBackend } from "$lib/server/backend";

/**
 * Recibe el token FCM del navegador y lo reenvía al backend. El navegador no habla
 * directo con Nest: este endpoint añade la cookie de sesión, la cabecera anti-CSRF y
 * el uid_dispositivo (de la cookie httpOnly device_id, que el JS del cliente no ve).
 */
export const POST: RequestHandler = async (event) => {
  const { token } = await event.request.json().catch(() => ({ token: null }));
  const uid_dispositivo = event.cookies.get("device_id");

  if (!token || !uid_dispositivo) {
    return json({ ok: false }, { status: 400 });
  }

  const response = await requestBackend(event, "/devices/push-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uid_dispositivo, firebase_token_fcm: token }),
  });

  return json({ ok: response.ok }, { status: response.ok ? 200 : 502 });
};
