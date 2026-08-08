import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad, RequestEvent } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

interface OpcionTelefono {
  codigo: string;
  etiqueta: string;
  traducciones: Record<string, string>;
}

interface RespuestaTelefonos {
  telefonos: {
    id_personas_telefonos: string;
    codigo_tipo_telefono: string;
    numero: string;
    titular: string;
    es_emergencia: boolean;
    tipo_telefono: OpcionTelefono;
  }[];
  catalogo: OpcionTelefono[];
}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODIGO = /^[a-z0-9_]{1,80}$/;
const NUMERO = /^\+?[0-9][0-9\s().-]{5,29}$/;
const TITULAR = /^[\p{L}\p{N}][\p{L}\p{N}\s.'-]{1,119}$/u;

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

function leerTelefono(form: FormData) {
  const codigo_tipo_telefono = String(form.get("codigo_tipo_telefono") ?? "")
    .trim()
    .toLowerCase();
  const numero = String(form.get("numero") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const titular = String(form.get("titular") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const emergencia = String(form.get("es_emergencia") ?? "false");
  if (
    !CODIGO.test(codigo_tipo_telefono) ||
    !NUMERO.test(numero) ||
    !TITULAR.test(titular) ||
    !["true", "false"].includes(emergencia)
  )
    return null;
  return {
    codigo_tipo_telefono,
    numero,
    titular,
    es_emergencia: emergencia === "true",
  };
}

export const load: PageServerLoad = async (event) => {
  await event.parent();
  try {
    const response = await solicitarConRefresco(event, "/profile/phones");
    if (!response.ok)
      error(
        response.status,
        await mensajeBackend(response, "profile.phones.loadError"),
      );
    return (await response.json()) as RespuestaTelefonos;
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "profile.phones.loadError");
  }
};

async function guardar(
  event: RequestEvent,
  ruta: string,
  method: "POST" | "PATCH",
) {
  const telefono = leerTelefono(await event.request.formData());
  if (!telefono)
    return fail(400, { phoneMessage: "profile.phones.invalidData" });
  try {
    const response = await solicitarConRefresco(event, ruta, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(telefono),
    });
    if (!response.ok)
      return fail(response.status, {
        phoneMessage: await mensajeBackend(
          response,
          "profile.phones.saveError",
        ),
      });
    const body = (await response.json()) as Pick<
      RespuestaTelefonos,
      "telefonos"
    >;
    return {
      phoneMessage:
        method === "POST" ? "profile.phones.added" : "profile.phones.updated",
      telefonos: body.telefonos,
    };
  } catch {
    return fail(503, { phoneMessage: "profile.phones.saveError" });
  }
}

export const actions: Actions = {
  add: (event) => guardar(event, "/profile/phones", "POST"),
  edit: async (event) => {
    const copia = event.request.clone();
    const id = String(
      (await copia.formData()).get("id_personas_telefonos") ?? "",
    );
    if (!UUID_V4.test(id))
      return fail(400, { phoneMessage: "profile.phones.notFound" });
    return guardar(event, `/profile/phones/${id}`, "PATCH");
  },
  delete: async (event) => {
    const form = await event.request.formData();
    const id = String(form.get("id_personas_telefonos") ?? "");
    if (!UUID_V4.test(id))
      return fail(400, { phoneMessage: "profile.phones.notFound" });
    try {
      const response = await solicitarConRefresco(
        event,
        `/profile/phones/${id}`,
        { method: "DELETE" },
      );
      if (!response.ok)
        return fail(response.status, {
          phoneMessage: await mensajeBackend(
            response,
            "profile.phones.deleteError",
          ),
        });
      const body = (await response.json()) as Pick<
        RespuestaTelefonos,
        "telefonos"
      >;
      return {
        phoneMessage: "profile.phones.deleted",
        telefonos: body.telefonos,
      };
    } catch {
      return fail(503, { phoneMessage: "profile.phones.deleteError" });
    }
  },
};
