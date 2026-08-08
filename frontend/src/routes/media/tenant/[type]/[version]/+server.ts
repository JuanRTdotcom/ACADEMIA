import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requestBackend } from "$lib/server/backend";

function validVersion(type: string, version: string) {
  if (["escudo", "escudo_oscuro", "imagotipo", "imagotipo_oscuro", "login_escudo", "login_escudo_oscuro"].includes(type))
    return /^[0-9a-f-]{36}\.(?:png|jpg|webp)$/i.test(version);
  return type === "portada" && /^[0-9a-f-]{36}\.webp$/i.test(version);
}

export const GET: RequestHandler = async (event) => {
  const { type, version } = event.params;
  if (!validVersion(type, version)) {
    error(404, "companies.media.notFound");
  }
  const response = await requestBackend(
    event,
    `/tenants/current/media/${type}/${version}`,
  );
  const headers = new Headers();
  for (const nombre of [
    "content-type",
    "cache-control",
    "etag",
    "x-content-type-options",
    "cross-origin-resource-policy",
  ]) {
    const valor = response.headers.get(nombre);
    if (valor) headers.set(nombre, valor);
  }
  if (!response.ok) headers.set("cache-control", "no-store");
  return new Response(response.body, { status: response.status, headers });
};
