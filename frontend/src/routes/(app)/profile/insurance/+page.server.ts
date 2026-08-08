import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad, RequestEvent } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

interface SeguroMaestro {
  codigo: string;
  etiqueta: string;
  traducciones: Record<string, string>;
  permite_otro: boolean;
}

interface RespuestaSeguros {
  seguros: {
    id_personas_seguros: string;
    codigo_seguro: string;
    nombre_otro: string | null;
    numero_seguro: string;
    seguro: SeguroMaestro;
  }[];
  catalogo: SeguroMaestro[];
}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NOMBRE_OTRO = /^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]{1,119}$/u;
const NUMERO_SEGURO = /^[\p{L}\p{N}][\p{L}\p{N}\s./-]{0,79}$/u;

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

function leerSeguro(datos: FormData) {
  const codigo_seguro = String(datos.get("codigo_seguro") ?? "").trim();
  const nombre_otro = String(datos.get("nombre_otro") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const numero_seguro = String(datos.get("numero_seguro") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (
    !/^[a-z0-9_]{1,80}$/.test(codigo_seguro) ||
    !NUMERO_SEGURO.test(numero_seguro)
  )
    return null;
  if (nombre_otro && !NOMBRE_OTRO.test(nombre_otro)) return null;
  return { codigo_seguro, nombre_otro: nombre_otro || null, numero_seguro };
}

export const load: PageServerLoad = async (event) => {
  await event.parent();
  try {
    const response = await solicitarConRefresco(event, "/profile/insurance");
    if (!response.ok)
      error(
        response.status,
        await mensajeBackend(response, "profile.insurance.loadError"),
      );
    return (await response.json()) as RespuestaSeguros;
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "profile.insurance.loadError");
  }
};

async function mutar(
  event: RequestEvent,
  ruta: string,
  method: "POST" | "PATCH" | "DELETE",
) {
  const datos = await event.request.formData();
  const seguro = method === "DELETE" ? null : leerSeguro(datos);
  if (method !== "DELETE" && !seguro)
    return fail(400, { insuranceMessage: "profile.insurance.invalidData" });
  try {
    const response = await solicitarConRefresco(event, ruta, {
      method,
      ...(seguro
        ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(seguro),
          }
        : {}),
    });
    if (!response.ok) {
      return fail(response.status, {
        insuranceMessage: await mensajeBackend(
          response,
          "profile.insurance.saveError",
        ),
      });
    }
    const body = (await response.json()) as Pick<RespuestaSeguros, "seguros">;
    return {
      insuranceMessage: `profile.insurance.${method === "POST" ? "added" : method === "PATCH" ? "updated" : "deleted"}`,
      seguros: body.seguros,
    };
  } catch {
    return fail(503, { insuranceMessage: "profile.insurance.saveError" });
  }
}

export const actions: Actions = {
  add: (event) => mutar(event, "/profile/insurance", "POST"),
  edit: async (event) => {
    const copia = event.request.clone();
    const id = String(
      (await copia.formData()).get("id_personas_seguros") ?? "",
    );
    if (!UUID_V4.test(id))
      return fail(400, { insuranceMessage: "profile.insurance.notFound" });
    return mutar(event, `/profile/insurance/${id}`, "PATCH");
  },
  delete: async (event) => {
    const copia = event.request.clone();
    const id = String(
      (await copia.formData()).get("id_personas_seguros") ?? "",
    );
    if (!UUID_V4.test(id))
      return fail(400, { insuranceMessage: "profile.insurance.notFound" });
    return mutar(event, `/profile/insurance/${id}`, "DELETE");
  },
};
