import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad, RequestEvent } from "./$types";
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
      `/countries${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    );
    if (!response.ok)
      error(response.status, await message(response, "countries.loadError"));
    const paises = await response.json();
    return { paises, q };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "countries.serviceUnavailable");
  }
};

export const actions: Actions = {
  status: async (event) => {
    const form = await event.request.formData();
    const id = String(form.get("id") ?? "").trim();
    const rawActivo = form.get("activo");
    if (!id) return fail(400, { countryMessage: "countries.notFound" });
    if (rawActivo !== "true" && rawActivo !== "false") {
      return fail(400, { countryMessage: "countries.invalidData" });
    }
    const activo = rawActivo === "true";
    try {
      const response = await request(event, `/countries/${id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activo }),
      });
      if (!response.ok) {
        return fail(response.status, {
          countryMessage: await message(response, "countries.saveError"),
        });
      }
      return { countryMessage: "countries.updated" };
    } catch {
      return fail(503, { countryMessage: "countries.serviceUnavailable" });
    }
  },
};
