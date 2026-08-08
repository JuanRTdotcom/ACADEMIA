import { fail, redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import type { RequestEvent } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { passwordSchema } from "$lib/schemas/password";
import {
  copyAuthCookies,
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

async function mensajeBackend(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  return typeof body?.message === "string" && body.message.trim()
    ? body.message
    : fallback;
}

/** Nunca devuelve contraseñas en el payload de la acción. */
function limpiarSecretos<T extends { data: Record<string, unknown> }>(form: T) {
  form.data = {
    ...form.data,
    contrasenia_actual: "",
    contrasenia_nueva: "",
    confirmacion_contrasenia: "",
  };
  return form;
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

export const load: PageServerLoad = async (event) => {
  await event.parent();
  return {
    form: await superValidate(valibot(passwordSchema)),
  };
};

export const actions: Actions = {
  password: async (event) => {
    const form = await superValidate(event.request, valibot(passwordSchema));
    if (!form.valid) return fail(400, { form: limpiarSecretos(form) });

    const guardar = () =>
      solicitarConRefresco(event, "/profile/password", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form.data),
      });

    let response: Response;
    try {
      response = await guardar();
    } catch {
      return message(limpiarSecretos(form), "profile.password.saveError", {
        status: 503,
      });
    }

    if (response.status === 401) redirect(303, "/login");
    if (!response.ok) {
      const status =
        response.status === 429 ? 429 : response.status >= 500 ? 503 : 400;
      return message(
        limpiarSecretos(form),
        await mensajeBackend(response, "profile.password.saveError"),
        { status },
      );
    }

    copyAuthCookies(
      response.headers,
      event.cookies,
      event.url.protocol === "https:",
    );

    return message(limpiarSecretos(form), "profile.password.updated");
  },
  twoFactor: async (event) => {
    const datos = await event.request.formData();
    const valor = datos.get("habilitado");
    if (valor !== "true" && valor !== "false") {
      return fail(400, { message: "profile.twoFactor.saveError" });
    }

    let response: Response;
    try {
      response = await solicitarConRefresco(event, "/profile/two-factor", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ habilitado: valor === "true" }),
      });
    } catch {
      return fail(503, { message: "profile.twoFactor.saveError" });
    }

    if (response.status === 401) redirect(303, "/login");
    if (!response.ok) {
      const status =
        response.status === 429 ? 429 : response.status >= 500 ? 503 : 400;
      return fail(status, {
        message: await mensajeBackend(response, "profile.twoFactor.saveError"),
      });
    }

    return { segundoFactorActualizado: true };
  },
};
