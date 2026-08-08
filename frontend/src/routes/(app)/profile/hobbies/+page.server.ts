import { error, fail, redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

interface OpcionCatalogo {
  codigo: string;
  etiqueta: string;
  traducciones: Record<string, string>;
}

interface HobbyPersona {
  id_personas_hobbies: string;
  codigo_hobby: string;
  hobby_personalizado: string | null;
  hobby: OpcionCatalogo;
  codigo_frecuencia: string;
  frecuencia: OpcionCatalogo;
}

interface RespuestaHobbies {
  hobbies: HobbyPersona[];
  catalogoHobbies: OpcionCatalogo[];
  catalogoFrecuencias: OpcionCatalogo[];
}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HOBBY_OTROS = "otros";
const CODIGO_CATALOGO = /^[a-z0-9_]{1,80}$/;
const HOBBY_PERSONALIZADO = /^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]{1,99}$/u;

async function mensajeBackend(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  return typeof body?.message === "string" && body.message.trim()
    ? body.message
    : fallback;
}

async function solicitarConRefresco(
  event: RequestEvent,
  ruta: string,
  init?: RequestInit,
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

/** Hobbies y catálogos (hobbies + frecuencias) llegan desde Nest antes del render. */
export const load: PageServerLoad = async (event) => {
  await event.parent();
  try {
    const response = await solicitarConRefresco(event, "/profile/hobbies");
    if (!response.ok)
      error(
        response.status,
        await mensajeBackend(response, "profile.hobbies.loadError"),
      );
    return (await response.json()) as RespuestaHobbies;
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "profile.hobbies.loadError");
  }
};

async function guardar(
  event: RequestEvent,
  ruta: string,
  method: "POST" | "PATCH",
) {
  const datos = await event.request.formData();
  const codigo_hobby = String(datos.get("codigo_hobby") ?? "").trim();
  const hobby_personalizado = String(
    datos.get("hobby_personalizado") ?? "",
  ).trim();
  const codigo_frecuencia = String(datos.get("codigo_frecuencia") ?? "").trim();

  if (!CODIGO_CATALOGO.test(codigo_hobby)) {
    return fail(400, { hobbyMessage: "profile.hobbies.invalidHobby" });
  }
  if (!CODIGO_CATALOGO.test(codigo_frecuencia)) {
    return fail(400, { hobbyMessage: "profile.hobbies.invalidFrequency" });
  }
  if (codigo_hobby === HOBBY_OTROS && hobby_personalizado.length < 2) {
    return fail(400, { hobbyMessage: "profile.hobbies.customRequired" });
  }
  if (hobby_personalizado && !HOBBY_PERSONALIZADO.test(hobby_personalizado)) {
    return fail(400, { hobbyMessage: "profile.hobbies.customRequired" });
  }

  try {
    const response = await solicitarConRefresco(event, ruta, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        codigo_hobby,
        codigo_frecuencia,
        ...(codigo_hobby === HOBBY_OTROS ? { hobby_personalizado } : {}),
      }),
    });
    if (!response.ok) {
      return fail(response.status, {
        hobbyMessage: await mensajeBackend(
          response,
          "profile.hobbies.saveError",
        ),
      });
    }
    const body = (await response.json()) as Pick<RespuestaHobbies, "hobbies">;
    return {
      hobbyMessage:
        method === "POST" ? "profile.hobbies.added" : "profile.hobbies.updated",
      hobbies: body.hobbies,
    };
  } catch {
    return fail(503, { hobbyMessage: "profile.hobbies.saveError" });
  }
}

export const actions: Actions = {
  add: (event) => guardar(event, "/profile/hobbies", "POST"),
  edit: async (event) => {
    const copia = event.request.clone();
    const id = String(
      (await copia.formData()).get("id_personas_hobbies") ?? "",
    );
    if (!UUID_V4.test(id))
      return fail(400, { hobbyMessage: "profile.hobbies.notFound" });
    return guardar(event, `/profile/hobbies/${id}`, "PATCH");
  },
  delete: async (event) => {
    const datos = await event.request.formData();
    const id = String(datos.get("id_personas_hobbies") ?? "");
    if (!UUID_V4.test(id)) {
      return fail(400, { hobbyMessage: "profile.hobbies.notFound" });
    }
    try {
      const response = await solicitarConRefresco(
        event,
        `/profile/hobbies/${id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        return fail(response.status, {
          hobbyMessage: await mensajeBackend(
            response,
            "profile.hobbies.deleteError",
          ),
        });
      }
      const body = (await response.json()) as Pick<RespuestaHobbies, "hobbies">;
      return { hobbyMessage: "profile.hobbies.deleted", hobbies: body.hobbies };
    } catch {
      return fail(503, { hobbyMessage: "profile.hobbies.deleteError" });
    }
  },
};
