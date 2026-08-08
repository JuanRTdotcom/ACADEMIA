import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad, RequestEvent } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAME = /^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TAX = /^[A-Z0-9.\-]{8,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9\s-]*$/;

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

async function mutationMessage(response: Response, fallback: string) {
  if (response.status === 404) return "companies.refreshRequired";
  return message(response, fallback);
}

const text = (form: FormData, field: string) =>
  String(form.get(field) ?? "")
    .trim()
    .replace(/\s+/g, " ");

function companyBody(form: FormData) {
  return {
    nombre: text(form, "nombre"),
    razon_social: text(form, "razon_social"),
    ruc_nif: text(form, "ruc_nif").toUpperCase(),
    slug: text(form, "slug").toLowerCase(),
    correo_contacto: text(form, "correo_contacto").toLowerCase(),
    telefono: text(form, "telefono"),
  };
}

function validCompany(body: ReturnType<typeof companyBody>) {
  const phoneDigits = body.telefono.replace(/\D/g, "").length;
  return (
    body.nombre.length >= 2 &&
    body.nombre.length <= 120 &&
    NAME.test(body.nombre) &&
    body.razon_social.length >= 2 &&
    body.razon_social.length <= 150 &&
    NAME.test(body.razon_social) &&
    TAX.test(body.ruc_nif) &&
    body.slug.length <= 63 &&
    SLUG.test(body.slug) &&
    body.correo_contacto.length <= 120 &&
    EMAIL.test(body.correo_contacto) &&
    body.telefono.length <= 30 &&
    phoneDigits >= 7 &&
    phoneDigits <= 15 &&
    PHONE.test(body.telefono)
  );
}

export const load: PageServerLoad = async (event) => {
  await event.parent();
  const q = event.url.searchParams.get("q")?.trim() ?? "";
  try {
    const [companiesResponse, plansResponse] = await Promise.all([
      request(event, `/companies${q ? `?q=${encodeURIComponent(q)}` : ""}`),
      request(event, "/plans")
    ]);
    if (!companiesResponse.ok)
      error(companiesResponse.status, await message(companiesResponse, "companies.loadError"));
    if (!plansResponse.ok)
      error(plansResponse.status, await message(plansResponse, "plans.loadError"));
      
    const companiesData = await companiesResponse.json();
    const plansData = await plansResponse.json();
    return { ...companiesData, planes: plansData, q };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "companies.serviceUnavailable");
  }
};

export const actions: Actions = {
  create: async (event) => {
    const body = companyBody(await event.request.formData());
    if (!validCompany(body))
      return fail(400, { companyMessage: "companies.invalidData" });
    try {
      const response = await request(event, "/companies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        return fail(response.status, {
          companyMessage: await message(response, "companies.saveError"),
        });
      return { companyMessage: "companies.created" };
    } catch {
      return fail(503, { companyMessage: "companies.serviceUnavailable" });
    }
  },
  edit: async (event) => {
    const form = await event.request.formData();
    const id = text(form, "id");
    const body = companyBody(form);
    if (!UUID.test(id))
      return fail(400, { companyMessage: "companies.notFound" });
    if (!validCompany(body))
      return fail(400, { companyMessage: "companies.invalidData" });
    try {
      const response = await request(event, `/companies/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        return fail(response.status, {
          companyMessage: await mutationMessage(
            response,
            "companies.saveError",
          ),
        });
      return { companyMessage: "companies.updated" };
    } catch {
      return fail(503, { companyMessage: "companies.serviceUnavailable" });
    }
  },
  status: async (event) => {
    const form = await event.request.formData();
    const id = text(form, "id");
    const rawActivo = form.get("activo");
    if (!UUID.test(id))
      return fail(400, { companyMessage: "companies.notFound" });
    if (rawActivo !== "true" && rawActivo !== "false") {
      return fail(400, { companyMessage: "companies.invalidData" });
    }
    const activo = rawActivo === "true";
    try {
      const response = await request(event, `/companies/${id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activo }),
      });
      if (!response.ok)
        return fail(response.status, {
          companyMessage: await mutationMessage(
            response,
            "companies.saveError",
          ),
        });
      return {
        companyMessage: activo
          ? "companies.activated"
          : "companies.deactivated",
      };
    } catch {
      return fail(503, { companyMessage: "companies.serviceUnavailable" });
    }
  },
  delete: async (event) => {
    const id = text(await event.request.formData(), "id");
    if (!UUID.test(id))
      return fail(400, { companyMessage: "companies.notFound" });
    try {
      const response = await request(event, `/companies/${id}`, {
        method: "DELETE",
      });
      if (!response.ok)
        return fail(response.status, {
          companyMessage: await mutationMessage(
            response,
            "companies.deleteError",
          ),
        });
      return { companyMessage: "companies.deleted" };
    } catch {
      return fail(503, { companyMessage: "companies.serviceUnavailable" });
    }
  },
  renew: async (event) => {
    const form = await event.request.formData();
    const id = text(form, "id");
    const fid_planes = text(form, "fid_planes");
    const fecha_inicio = text(form, "fecha_inicio");
    const fecha_fin = text(form, "fecha_fin");
    const rawMonto = form.get("monto");
    const metodo_pago = text(form, "metodo_pago") || undefined;

    if (!UUID.test(id) || !UUID.test(fid_planes))
      return fail(400, { companyMessage: "companies.notFound" });
    if (!fecha_inicio || !fecha_fin || isNaN(Date.parse(fecha_inicio)) || isNaN(Date.parse(fecha_fin)))
      return fail(400, { companyMessage: "companies.invalidData" });

    const monto = rawMonto ? Number(rawMonto) : undefined;
    try {
      const response = await request(event, `/companies/${id}/renew`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fid_planes,
          fecha_inicio,
          fecha_fin,
          monto,
          metodo_pago,
        }),
      });
      if (!response.ok) {
        return fail(response.status, {
          companyMessage: await mutationMessage(
            response,
            "companies.saveError",
          ),
        });
      }
      return { companyMessage: "companies.renewed" };
    } catch {
      return fail(503, { companyMessage: "companies.serviceUnavailable" });
    }
  },
};
