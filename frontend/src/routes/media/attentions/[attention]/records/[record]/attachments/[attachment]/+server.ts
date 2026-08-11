import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { UUID } from "$lib/server/companies";
import { copyAuthCookieValues, refreshBackendSession, requestBackend } from "$lib/server/backend";

export const GET: RequestHandler = async (event) => {
  const { attention, record, attachment } = event.params;
  if (![attention, record, attachment].every((id) => UUID.test(id))) error(404, "attentions.attachmentNotFound");
  const call = () => requestBackend(event, `/clinic/attentions/${attention}/records/${record}/attachments/${attachment}`);
  try {
    let response = await call();
    if (response.status === 401) { const refresh = await refreshBackendSession(event); if (refresh.ok) { copyAuthCookieValues(refresh.cookies, event.cookies, event.url.protocol === "https:"); response = await call(); } }
    if (!response.ok) error(response.status, "attentions.attachmentNotFound");
    const headers = new Headers();
    for (const name of ["content-type", "cache-control", "etag", "x-content-type-options", "content-disposition", "cross-origin-resource-policy", "content-security-policy"]) { const value = response.headers.get(name); if (value) headers.set(name, value); }
    return new Response(response.body, { status: response.status, headers });
  } catch (cause) { if (cause && typeof cause === "object" && "status" in cause) throw cause; return json({ message: "attentions.loadError" }, { status: 503, headers: { "cache-control": "private, no-store" } }); }
};
