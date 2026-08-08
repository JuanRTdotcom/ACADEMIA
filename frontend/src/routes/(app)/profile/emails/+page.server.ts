import { fail, redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";
import type { ResumenAccionesRequeridas } from "$lib/required-actions";

type RespuestaCorreos = {
  correos: unknown[];
  acciones_requeridas: ResumenAccionesRequeridas;
};

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
  init: RequestInit,
): Promise<Response> {
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

/** Los correos ya llegan en el contexto SSR validado por el layout. */
export const load: PageServerLoad = async (event) => {
  await event.parent();
  return {};
};

export const actions: Actions = {
  addEmail: async (event) => {
    const datos = await event.request.formData();
    const correo = String(datos.get("correo") ?? "")
      .trim()
      .toLowerCase();
    if (correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return fail(400, { emailMessage: "profile.email.invalid" });
    }
    try {
      const response = await solicitarConRefresco(event, "/profile/emails", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ correo }),
      });
      if (!response.ok)
        return fail(response.status === 429 ? 429 : 400, {
          emailMessage: await mensajeBackend(
            response,
            "profile.email.saveError",
          ),
        });
      const body = (await response.json()) as RespuestaCorreos;
      return {
        emailMessage: "profile.email.added",
        correos: body.correos,
        acciones_requeridas: body.acciones_requeridas,
      };
    } catch {
      return fail(503, { emailMessage: "profile.email.saveError" });
    }
  },
  modifyEmail: async (event) => {
    const datos = await event.request.formData();
    const id = String(datos.get("id_personas_correos") ?? "");
    const correo = String(datos.get("correo") ?? "")
      .trim()
      .toLowerCase();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      ) ||
      correo.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    ) {
      return fail(400, { emailMessage: "profile.email.invalid" });
    }
    try {
      const response = await solicitarConRefresco(
        event,
        `/profile/emails/${id}/address`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ correo }),
        },
      );
      if (!response.ok)
        return fail(response.status, {
          emailMessage: await mensajeBackend(
            response,
            "profile.email.modifyError",
          ),
        });
      const body = (await response.json()) as RespuestaCorreos;
      return {
        emailMessage: "profile.email.modified",
        correos: body.correos,
        acciones_requeridas: body.acciones_requeridas,
      };
    } catch {
      return fail(503, { emailMessage: "profile.email.modifyError" });
    }
  },
  deleteEmail: async (event) => {
    const datos = await event.request.formData();
    const id = String(datos.get("id_personas_correos") ?? "");
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return fail(400, { emailMessage: "profile.email.notFound" });
    }
    try {
      const response = await solicitarConRefresco(
        event,
        `/profile/emails/${id}`,
        { method: "DELETE" },
      );
      if (!response.ok)
        return fail(response.status, {
          emailMessage: await mensajeBackend(
            response,
            "profile.email.deleteError",
          ),
        });
      const body = (await response.json()) as RespuestaCorreos;
      return {
        emailMessage: "profile.email.deleted",
        correos: body.correos,
        acciones_requeridas: body.acciones_requeridas,
      };
    } catch {
      return fail(503, { emailMessage: "profile.email.deleteError" });
    }
  },
  emailUse: async (event) => {
    const datos = await event.request.formData();
    const id_personas_correos = String(datos.get("id_personas_correos") ?? "");
    const tipo = String(datos.get("tipo") ?? "");
    if (
      !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id_personas_correos) ||
      !["principal", "mensajes", "respaldo"].includes(tipo)
    ) {
      return fail(400, { emailMessage: "profile.email.invalidSelection" });
    }
    try {
      const response = await solicitarConRefresco(
        event,
        "/profile/emails/use",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id_personas_correos, tipo }),
        },
      );
      if (!response.ok)
        return fail(response.status === 429 ? 429 : 400, {
          emailMessage: await mensajeBackend(
            response,
            "profile.email.saveError",
          ),
        });
      const body = (await response.json()) as RespuestaCorreos;
      return {
        emailMessage: "profile.email.useUpdated",
        correos: body.correos,
        acciones_requeridas: body.acciones_requeridas,
      };
    } catch {
      return fail(503, { emailMessage: "profile.email.saveError" });
    }
  },
  emailVerification: async (event) => {
    const datos = await event.request.formData();
    const id = String(datos.get("id_personas_correos") ?? "");
    const valor = datos.get("verificado");
    if (
      !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) ||
      (valor !== "true" && valor !== "false")
    ) {
      return fail(400, { emailMessage: "profile.email.invalidVerification" });
    }
    try {
      const response = await solicitarConRefresco(
        event,
        `/profile/emails/${id}/verification`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ verificado: valor === "true" }),
        },
      );
      if (!response.ok)
        return fail(response.status === 429 ? 429 : 400, {
          emailMessage: await mensajeBackend(
            response,
            "profile.email.saveError",
          ),
        });
      const body = (await response.json()) as RespuestaCorreos;
      return {
        emailMessage: "profile.email.verificationUpdated",
        correos: body.correos,
        acciones_requeridas: body.acciones_requeridas,
      };
    } catch {
      return fail(503, { emailMessage: "profile.email.saveError" });
    }
  },
};
