import { error, redirect } from "@sveltejs/kit";
import type { RequestEvent, RequestHandler } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|webp)$/i;

async function requestImage(event: RequestEvent, path: string) {
  let response = await requestBackend(event, path);
  if (response.status !== 401) return response;

  const refresh = await refreshBackendSession(event);
  if (!refresh.ok) redirect(303, "/login");
  copyAuthCookieValues(
    refresh.cookies,
    event.cookies,
    event.url.protocol === "https:",
  );
  response = await requestBackend(event, path);
  if (response.status === 401) redirect(303, "/login");
  return response;
}

export const GET: RequestHandler = async (event) => {
  const { id, type, version } = event.params;
  if (
    !UUID.test(id) ||
    !["escudo", "escudo_oscuro"].includes(type) ||
    !VERSION.test(version)
  ) {
    error(404, "companies.media.notFound");
  }

  const response = await requestImage(
    event,
    `/companies/${id}/media/${type}/${version}`,
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
