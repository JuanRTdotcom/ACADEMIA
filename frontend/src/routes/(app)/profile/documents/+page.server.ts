import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad, RequestEvent } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

interface OpcionDocumento {
  codigo: string;
  etiqueta: string;
  traducciones: Record<string, string>;
}

interface RespuestaDocumentos {
  documentos: {
    id_personas_documentos: string;
    codigo_tipo_documento: string;
    numero_documento: string;
    tipo_documento: OpcionDocumento;
  }[];
  catalogo: OpcionDocumento[];
}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODIGO = /^[a-z0-9_]{1,80}$/;
const NUMERO = /^[A-Za-z0-9][A-Za-z0-9 .\-/]{0,39}$/;

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

export const load: PageServerLoad = async (event) => {
  await event.parent();
  try {
    const response = await solicitarConRefresco(event, "/profile/documents");
    if (!response.ok)
      error(
        response.status,
        await mensajeBackend(response, "profile.documents.loadError"),
      );
    return (await response.json()) as RespuestaDocumentos;
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "profile.documents.loadError");
  }
};

function leerDocumento(form: FormData) {
  const codigo_tipo_documento = String(form.get("codigo_tipo_documento") ?? "")
    .trim()
    .toLowerCase();
  const numero_documento = String(form.get("numero_documento") ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  if (!CODIGO.test(codigo_tipo_documento) || !NUMERO.test(numero_documento))
    return null;
  return { codigo_tipo_documento, numero_documento };
}

async function guardar(
  event: RequestEvent,
  ruta: string,
  method: "POST" | "PATCH",
) {
  const documento = leerDocumento(await event.request.formData());
  if (!documento)
    return fail(400, { documentMessage: "profile.documents.invalidData" });
  try {
    const response = await solicitarConRefresco(event, ruta, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(documento),
    });
    if (!response.ok)
      return fail(response.status, {
        documentMessage: await mensajeBackend(
          response,
          "profile.documents.saveError",
        ),
      });
    const body = (await response.json()) as Pick<
      RespuestaDocumentos,
      "documentos"
    >;
    return {
      documentMessage:
        method === "POST"
          ? "profile.documents.added"
          : "profile.documents.updated",
      documentos: body.documentos,
    };
  } catch {
    return fail(503, { documentMessage: "profile.documents.saveError" });
  }
}

export const actions: Actions = {
  add: (event) => guardar(event, "/profile/documents", "POST"),
  edit: async (event) => {
    const copia = event.request.clone();
    const id = String(
      (await copia.formData()).get("id_personas_documentos") ?? "",
    );
    if (!UUID_V4.test(id))
      return fail(400, { documentMessage: "profile.documents.notFound" });
    return guardar(event, `/profile/documents/${id}`, "PATCH");
  },
  delete: async (event) => {
    const form = await event.request.formData();
    const id = String(form.get("id_personas_documentos") ?? "");
    if (!UUID_V4.test(id))
      return fail(400, { documentMessage: "profile.documents.notFound" });
    try {
      const response = await solicitarConRefresco(
        event,
        `/profile/documents/${id}`,
        { method: "DELETE" },
      );
      if (!response.ok)
        return fail(response.status, {
          documentMessage: await mensajeBackend(
            response,
            "profile.documents.deleteError",
          ),
        });
      const body = (await response.json()) as Pick<
        RespuestaDocumentos,
        "documentos"
      >;
      return {
        documentMessage: "profile.documents.deleted",
        documentos: body.documentos,
      };
    } catch {
      return fail(503, { documentMessage: "profile.documents.deleteError" });
    }
  },
};
