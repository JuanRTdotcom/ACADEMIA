import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad, RequestEvent } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

async function request(event: RequestEvent, route: string, init?: RequestInit) {
  let response = await requestBackend(event, route, init);
  if (response.status !== 401) return response;
  const refresh = await refreshBackendSession(event);
  if (!refresh.ok) redirect(303, "/login");
  copyAuthCookieValues(
    refresh.cookies,
    event.cookies,
    event.url.protocol === "https:",
  );
  response = await requestBackend(event, route, init);
  if (response.status === 401) redirect(303, "/login");
  return response;
}

async function message(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  return typeof body?.message === "string" ? body.message : fallback;
}

export const load: PageServerLoad = async (event) => {
  await event.parent();
  const q = event.url.searchParams.get("q")?.trim() ?? "";
  try {
    const response = await request(
      event,
      `/companies/renewals?limit=20${q ? `&q=${encodeURIComponent(q)}` : ""}`
    );
    if (!response.ok) {
      error(response.status, await message(response, "subscriptions.loadError"));
    }
    const renewals = await response.json();
    return { renewals, q };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "subscriptions.serviceUnavailable");
  }
};
