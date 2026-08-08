import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";
import { serverConfig } from "$lib/server/config";

async function solicitarConRefresco(
  event: Parameters<RequestHandler>[0],
  crear: () => Promise<Response>,
): Promise<Response> {
  let response = await crear();
  if (response.status !== 401) return response;

  const refresco = await refreshBackendSession(event);
  if (!refresco.ok) return response;
  copyAuthCookieValues(
    refresco.cookies,
    event.cookies,
    event.url.protocol === "https:",
  );
  response = await crear();
  return response;
}

function reenviar(response: Response, versionSolicitada?: string): Response {
  const etag = response.headers.get("etag");
  const versionCoincide =
    Boolean(versionSolicitada) && etag === `"${versionSolicitada}"`;
  const puedeCachearImagen =
    response.ok &&
    versionCoincide &&
    response.headers.get("content-type") === "image/jpeg";
  const headers = new Headers({
    "cache-control": puedeCachearImagen
      ? (response.headers.get("cache-control") ?? "private, no-store")
      : "private, no-store",
  });
  for (const nombre of [
    "content-type",
    "retry-after",
    "x-content-type-options",
    "content-disposition",
    "cross-origin-resource-policy",
    "content-security-policy",
    "etag",
    "vary",
  ]) {
    const valor = response.headers.get(nombre);
    if (valor) headers.set(nombre, valor);
  }
  return new Response(response.body, { status: response.status, headers });
}

export const GET: RequestHandler = async (event) => {
  try {
    const version = event.url.searchParams.get("v") ?? undefined;
    return reenviar(
      await solicitarConRefresco(event, () =>
        requestBackend(event, "/profile/avatar"),
      ),
      version,
    );
  } catch {
    return json(
      { message: "profile.avatar.loadError" },
      { status: 503, headers: { "cache-control": "private, no-store" } },
    );
  }
};

export const POST: RequestHandler = async (event) => {
  const margenMultipart = 65_536;
  const limiteSolicitud = serverConfig.avatarMaxBytes + margenMultipart;
  const longitud = Number(event.request.headers.get("content-length"));
  if (Number.isFinite(longitud) && longitud > limiteSolicitud) {
    return json({ message: "profile.avatar.tooLarge" }, { status: 413 });
  }

  try {
    const cuerpo = await event.request.arrayBuffer();
    if (cuerpo.byteLength > limiteSolicitud) {
      return json({ message: "profile.avatar.tooLarge" }, { status: 413 });
    }
    const tipo = event.request.headers.get("content-type");
    if (!tipo?.startsWith("multipart/form-data;")) {
      return json({ message: "profile.avatar.invalidFile" }, { status: 400 });
    }

    return reenviar(
      await solicitarConRefresco(event, () =>
        requestBackend(event, "/profile/avatar", {
          method: "POST",
          headers: { "content-type": tipo },
          body: cuerpo,
        }),
      ),
    );
  } catch {
    return json({ message: "profile.avatar.saveError" }, { status: 503 });
  }
};

export const DELETE: RequestHandler = async (event) => {
  try {
    return reenviar(
      await solicitarConRefresco(event, () =>
        requestBackend(event, "/profile/avatar", { method: "DELETE" }),
      ),
    );
  } catch {
    return json({ message: "profile.avatar.deleteError" }, { status: 503 });
  }
};
