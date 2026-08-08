import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad, RequestEvent } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

// Cualquier versión de UUID (el backend no exige v4; hay ids semilla no-v4).
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[A-Z0-9_]{2,40}$/i;

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

const text = (form: FormData, field: string) =>
  String(form.get(field) ?? "")
    .trim()
    .replace(/\s+/g, " ");

function planBody(form: FormData) {
  return {
    codigo: text(form, "codigo").toUpperCase(),
    nombre: text(form, "nombre"),
    descripcion: text(form, "descripcion"),
  };
}

function validPlan(body: ReturnType<typeof planBody>) {
  return (
    CODE.test(body.codigo) &&
    body.nombre.length >= 2 &&
    body.nombre.length <= 100 &&
    body.descripcion.length <= 250
  );
}

export const load: PageServerLoad = async (event) => {
  await event.parent();
  try {
    const plansResponse = await request(event, "/plans");
    if (!plansResponse.ok)
      error(plansResponse.status, await message(plansResponse, "plans.loadError"));

    return {
      planes: await plansResponse.json(),
    };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "plans.serviceUnavailable");
  }
};

export const actions: Actions = {
  create: async (event) => {
    const body = planBody(await event.request.formData());
    if (!validPlan(body))
      return fail(400, { planMessage: "plans.invalidData" });
    try {
      const response = await request(event, "/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        return fail(response.status, {
          planMessage: await message(response, "plans.saveError"),
        });
      return { planMessage: "plans.created" };
    } catch {
      return fail(503, { planMessage: "plans.serviceUnavailable" });
    }
  },
  edit: async (event) => {
    const form = await event.request.formData();
    const id = text(form, "id");
    const body = planBody(form);
    if (!UUID.test(id))
      return fail(400, { planMessage: "plans.notFound" });
    if (!validPlan(body))
      return fail(400, { planMessage: "plans.invalidData" });
    try {
      const response = await request(event, `/plans/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        return fail(response.status, {
          planMessage: await message(response, "plans.saveError"),
        });
      return { planMessage: "plans.updated" };
    } catch {
      return fail(503, { planMessage: "plans.serviceUnavailable" });
    }
  },
  status: async (event) => {
    const form = await event.request.formData();
    const id = text(form, "id");
    const rawActivo = form.get("activo");
    if (!UUID.test(id))
      return fail(400, { planMessage: "plans.notFound" });
    if (rawActivo !== "true" && rawActivo !== "false") {
      return fail(400, { planMessage: "plans.invalidData" });
    }
    const activo = rawActivo === "true";
    try {
      const response = await request(event, `/plans/${id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activo }),
      });
      if (!response.ok)
        return fail(response.status, {
          planMessage: await message(response, "plans.saveError"),
        });
      return {
        planMessage: activo ? "plans.activated" : "plans.deactivated",
      };
    } catch {
      return fail(503, { planMessage: "plans.serviceUnavailable" });
    }
  },
  delete: async (event) => {
    const id = text(await event.request.formData(), "id");
    if (!UUID.test(id))
      return fail(400, { planMessage: "plans.notFound" });
    try {
      const response = await request(event, `/plans/${id}`, {
        method: "DELETE",
      });
      if (!response.ok)
        return fail(response.status, {
          planMessage: await message(response, "plans.deleteError"),
        });
      return { planMessage: "plans.deleted" };
    } catch {
      return fail(503, { planMessage: "plans.serviceUnavailable" });
    }
  },
};
