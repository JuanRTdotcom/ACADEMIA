import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { UUID } from "$lib/server/companies";
import { copyAuthCookieValues, refreshBackendSession, requestBackend } from "$lib/server/backend";

export const GET: RequestHandler = async (event) => {
  if (!UUID.test(event.params.id) || !/^[0-9a-f-]{36}\.jpg$/i.test(event.params.version)) error(404, "pets.notFound");
  const call = () => requestBackend(event, `/clinic/pets/${event.params.id}/photo/${event.params.version}`);
  try {
    let response = await call();
    if (response.status === 401) { const refresh = await refreshBackendSession(event); if (refresh.ok) { copyAuthCookieValues(refresh.cookies, event.cookies, event.url.protocol === "https:"); response = await call(); } }
    if (!response.ok) error(response.status, "pets.notFound");
    const headers = new Headers({ "cache-control": response.headers.get("cache-control") ?? "private, no-store" });
    for (const name of ["content-type", "etag", "x-content-type-options", "content-disposition", "cross-origin-resource-policy", "content-security-policy"]) { const value = response.headers.get(name); if (value) headers.set(name, value); }
    return new Response(response.body, { status: response.status, headers });
  } catch (cause) { if (cause && typeof cause === "object" && "status" in cause) throw cause; return json({ message: "pets.serviceUnavailable" }, { status: 503 }); }
};
