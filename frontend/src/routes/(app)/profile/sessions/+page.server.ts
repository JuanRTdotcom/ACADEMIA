import { error, fail, redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

interface SesionesUsuario {
  sesiones: {
    id_sesiones: string;
    actual: boolean;
    plataforma: string;
    tipo_dispositivo: string;
    modelo: string | null;
    version_so: string | null;
    version_app: string | null;
    agente_usuario: string | null;
    ip: string | null;
    ubicacion: {
      local: boolean;
      ciudad: string | null;
      pais_es: string | null;
      pais_en: string | null;
    } | null;
    iniciada_en: string;
    ultimo_uso_en: string;
    expira_inactividad_en: string;
  }[];
  zona_horaria: string;
  ahora: string;
}

async function solicitarConRefresco(
  event: RequestEvent,
  ruta: string,
  init: RequestInit,
) {
  let response = await requestBackend(event, ruta, init);
  if (response.status !== 401) return response;
  const refresco = await refreshBackendSession(event);
  if (!refresco.ok) redirect(303, "/login");
  copyAuthCookieValues(
    refresco.cookies,
    event.cookies,
    event.url.protocol === "https:",
  );
  response = await requestBackend(event, ruta, init);
  if (response.status === 401) redirect(303, "/login");
  return response;
}

async function mensajeBackend(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  return typeof body?.message === "string" && body.message.trim()
    ? body.message
    : fallback;
}

/** La lista completa llega desde Nest antes de renderizar la página. */
export const load: PageServerLoad = async (event) => {
  await event.parent();
  let response: Response;
  try {
    response = await requestBackend(event, "/profile/sessions");
  } catch {
    error(503, "profile.sessions.loadError");
  }
  if (response.status === 401) redirect(303, "/login");
  if (!response.ok) error(response.status, "profile.sessions.loadError");
  return (await response.json()) as SesionesUsuario;
};

export const actions: Actions = {
  revoke: async (event) => {
    const datos = await event.request.formData();
    const id = String(datos.get("id_sesiones") ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) {
      return fail(400, { sessionMessage: "profile.sessions.invalid" });
    }
    try {
      const response = await solicitarConRefresco(
        event,
        `/profile/sessions/${id}`,
        { method: "DELETE" },
      );
      if (!response.ok)
        return fail(response.status === 429 ? 429 : 400, {
          sessionMessage: await mensajeBackend(
            response,
            "profile.sessions.closeError",
          ),
        });
      return { sessionMessage: "profile.sessions.closed" };
    } catch {
      return fail(503, { sessionMessage: "profile.sessions.closeError" });
    }
  },
};
