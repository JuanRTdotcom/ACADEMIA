import { error, fail, redirect, type RequestEvent } from "@sveltejs/kit";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "./backend";

// Cualquier versión de UUID. El backend (ParseUUIDPipe) es la autoridad y no
// exige v4; algunos datos semilla usan UUID no-v4, así que el filtro previo del
// frontend no debe ser más estricto que el backend o rechazaría ids válidos.
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CompanySection =
  | "general"
  | "contact"
  | "digital-presence"
  | "identity"
  | "communications"
  | "region"
  | "services"
  | "agenda"
  | "fiscal"
  | "login-branding";

export async function companyRequest(
  event: RequestEvent,
  route: string,
  init?: RequestInit,
) {
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

export async function companyMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
    detalles?: unknown;
  } | null;
  if (typeof body?.message === "string" && body.message.trim())
    return body.message;
  const detail = Array.isArray(body?.detalles)
    ? body.detalles.find(
        (item): item is string => typeof item === "string" && Boolean(item),
      )
    : null;
  return detail ?? fallback;
}

export async function loadCompanySection<T>(
  event: RequestEvent,
  section: CompanySection,
) {
  try {
    const response = await companyRequest(
      event,
      `/company/current/sections/${section}`,
    );
    if (!response.ok)
      error(
        response.status,
        await companyMessage(response, "companies.loadError"),
      );
    return (await response.json()) as T;
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "companies.serviceUnavailable");
  }
}

export async function saveCompanySection(
  event: RequestEvent,
  section: CompanySection,
  body: Record<string, unknown>,
) {
  try {
    const response = await companyRequest(
      event,
      `/company/current/sections/${section}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      return fail(response.status, {
        companyMessage: await companyMessage(response, "companies.saveError"),
      });
    }
    return { companyMessage: "companies.updated" };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    return fail(503, { companyMessage: "companies.serviceUnavailable" });
  }
}

export interface CompanyBranding {
  escudo_version: string | null;
  escudo_oscuro_version: string | null;
  escudo_misma_imagen: boolean;
  imagotipo_version: string | null;
  imagotipo_oscuro_version: string | null;
  imagotipo_misma_imagen: boolean;
  login_escudo_version: string | null;
  login_escudo_oscuro_version: string | null;
  login_escudo_misma_imagen: boolean;
  portadas: Array<{
    id: string;
    version: string;
    orden: number;
    texto_alternativo: string;
  }>;
}

export async function loadCompanyBranding(
  event: RequestEvent,
): Promise<CompanyBranding> {
  const response = await companyRequest(event, "/company/current/branding");
  if (!response.ok)
    error(
      response.status,
      await companyMessage(response, "companies.loadError"),
    );
  return (await response.json()) as CompanyBranding;
}

export function formText(form: FormData, field: string) {
  return String(form.get(field) ?? "")
    .trim()
    .replace(/\s+/g, " ");
}
