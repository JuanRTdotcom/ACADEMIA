import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CatalogosApariencia {
  paises: {
    id_admin_level_0: string;
    codigo_iso2: string;
    nombre_es: string;
    nombre_en: string;
  }[];
  zonas_horarias: {
    id_zonas_horarias: string;
    nombre_iana: string;
    desfase_utc: string;
  }[];
}

interface ErrorBackend {
  message?: unknown;
}

/** Conserva el mensaje seguro y traducido que respondió NestJS. */
async function mensajeErrorBackend(
  response: Response,
  fallback: string,
): Promise<string> {
  const cuerpo = (await response.json().catch(() => null)) as ErrorBackend | null;
  return typeof cuerpo?.message === "string" && cuerpo.message.trim()
    ? cuerpo.message
    : fallback;
}

/** Primero resuelve el layout: así /auth/me y un posible refresh terminan antes. */
export const load: PageServerLoad = async (event) => {
  await event.parent();

  let response: Response;
  try {
    response = await requestBackend(event, "/system/catalogs/appearance");
  } catch {
    error(503, "profile.appearance.catalogError");
  }

  if (response.status === 401) redirect(303, "/login");
  if (!response.ok) error(response.status, "profile.appearance.catalogError");

  return { catalogos: (await response.json()) as CatalogosApariencia };
};

export const actions: Actions = {
  default: async (event) => {
    const datos = await event.request.formData();
    const fid_admin_level_0 = String(datos.get("fid_admin_level_0") ?? "");
    const fid_zonas_horarias = String(datos.get("fid_zonas_horarias") ?? "");

    if (!UUID.test(fid_admin_level_0) || !UUID.test(fid_zonas_horarias)) {
      return fail(400, { error: "profile.appearance.invalidSelection" });
    }

    const guardar = () =>
      requestBackend(event, "/profile/appearance", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fid_admin_level_0, fid_zonas_horarias }),
      });

    let response: Response;
    try {
      response = await guardar();
      if (response.status === 401) {
        const refresco = await refreshBackendSession(event);
        if (!refresco.ok) redirect(303, "/login");
        copyAuthCookieValues(
          refresco.cookies,
          event.cookies,
          event.url.protocol === "https:",
        );
        response = await guardar();
      }
    } catch {
      return fail(503, { error: "profile.appearance.saveError" });
    }

    if (response.status === 401) redirect(303, "/login");
    if (!response.ok) {
      return fail(response.status, {
        error: await mensajeErrorBackend(
          response,
          "profile.appearance.saveError",
        ),
      });
    }

    return { success: true };
  },
};
