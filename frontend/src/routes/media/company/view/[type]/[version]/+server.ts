import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { companyRequest } from "$lib/server/companies";

const TYPES = new Set([
  "escudo",
  "escudo_oscuro",
  "imagotipo",
  "imagotipo_oscuro",
  "login_escudo",
  "login_escudo_oscuro",
  "portada",
]);

export const GET: RequestHandler = async (event) => {
  const { type, version } = event.params;
  if (!TYPES.has(type) || !/^[0-9a-f-]{36}\.(?:png|jpg|webp)$/i.test(version)) {
    error(404, "companies.media.notFound");
  }
  const coverId = event.url.searchParams.get("coverId");
  if (type === "portada" && (!coverId || !/^[0-9a-f-]{36}$/i.test(coverId))) {
    error(404, "companies.media.notFound");
  }
  const query = type === "portada" ? `?coverId=${encodeURIComponent(coverId!)}` : "";
  const response = await companyRequest(
    event,
    `/company/current/media/${type}/${version}${query}`,
  );
  const headers = new Headers();
  for (const name of [
    "content-type",
    "cache-control",
    "etag",
    "x-content-type-options",
    "cross-origin-resource-policy",
  ]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!response.ok) headers.set("cache-control", "no-store");
  return new Response(response.body, { status: response.status, headers });
};
