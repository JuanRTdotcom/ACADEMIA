import { error, fail, redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

interface PaisNacionalidad {
  id_admin_level_0: string;
  codigo_iso2: string;
  nombre_es: string;
  nombre_en: string;
}

interface RespuestaNacionalidades {
  nacionalidades: {
    id_personas_nacionalidades: string;
    fid_admin_level_0: string;
    pais: PaisNacionalidad;
  }[];
  catalogo: PaisNacionalidad[];
}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function mensajeBackend(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  return typeof body?.message === "string" && body.message.trim()
    ? body.message
    : fallback;
}

async function solicitarConRefresco(
  event: RequestEvent,
  ruta: string,
  init?: RequestInit,
) {
  let response = await requestBackend(event, ruta, init);
  if (response.status !== 401) return response;
  const refresco = await refreshBackendSession(event);
  if (!refresco.ok) redirect(303, "/login");
  copyAuthCookieValues(
    refresco.cookies,
    event.cookies,
    event.url.protocol === "https:",
  );
  response = await requestBackend(event, ruta, init);
  if (response.status === 401) redirect(303, "/login");
  return response;
}

/** Catálogo y nacionalidades llegan desde Nest antes del primer render. */
export const load: PageServerLoad = async (event) => {
  await event.parent();
  try {
    const response = await solicitarConRefresco(
      event,
      "/profile/nationalities",
    );
    if (!response.ok)
      error(
        response.status,
        await mensajeBackend(response, "profile.nationalities.loadError"),
      );
    return (await response.json()) as RespuestaNacionalidades;
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "profile.nationalities.loadError");
  }
};

export const actions: Actions = {
  add: async (event) => {
    const datos = await event.request.formData();
    const fid_admin_level_0 = String(datos.get("fid_admin_level_0") ?? "");
    if (!UUID_V4.test(fid_admin_level_0)) {
      return fail(400, {
        nationalityMessage: "profile.nationalities.invalidCountry",
      });
    }
    try {
      const response = await solicitarConRefresco(
        event,
        "/profile/nationalities",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fid_admin_level_0 }),
        },
      );
      if (!response.ok) {
        return fail(response.status, {
          nationalityMessage: await mensajeBackend(
            response,
            "profile.nationalities.saveError",
          ),
        });
      }
      const body = (await response.json()) as Pick<
        RespuestaNacionalidades,
        "nacionalidades"
      >;
      return {
        nationalityMessage: "profile.nationalities.added",
        nacionalidades: body.nacionalidades,
      };
    } catch {
      return fail(503, {
        nationalityMessage: "profile.nationalities.saveError",
      });
    }
  },
  delete: async (event) => {
    const datos = await event.request.formData();
    const id = String(datos.get("id_personas_nacionalidades") ?? "");
    if (!UUID_V4.test(id)) {
      return fail(400, {
        nationalityMessage: "profile.nationalities.notFound",
      });
    }
    try {
      const response = await solicitarConRefresco(
        event,
        `/profile/nationalities/${id}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        return fail(response.status, {
          nationalityMessage: await mensajeBackend(
            response,
            "profile.nationalities.deleteError",
          ),
        });
      }
      const body = (await response.json()) as Pick<
        RespuestaNacionalidades,
        "nacionalidades"
      >;
      return {
        nationalityMessage: "profile.nationalities.deleted",
        nacionalidades: body.nacionalidades,
      };
    } catch {
      return fail(503, {
        nationalityMessage: "profile.nationalities.deleteError",
      });
    }
  },
};
