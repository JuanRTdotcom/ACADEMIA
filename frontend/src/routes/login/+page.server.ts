import { fail, redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { copyAuthCookies, requestBackend } from "$lib/server/backend";
import { getOrCreateDeviceId } from "$lib/server/device";
import { loginSchema } from "$lib/schemas/login";
import {
  applyPreferenceCookies,
  parseUserContext,
} from "$lib/server/user-context";

export const load: PageServerLoad = async (event) => {
  // Si ya hay sesión, no mostrar el login: ir directo al dashboard.
  if (event.locals.isAuthenticated) {
    redirect(303, "/dashboard");
  }

  // La primera visita se decide en SSR para que el título no cambie después de
  // pintar la página. La marca queda separada por tenant en este navegador.
  const { tenant } = await event.parent();
  const visitCookie = `sumaq_login_visit_${tenant.slug}`;
  const visitedBefore = event.cookies.get(visitCookie) === "1";
  if (!visitedBefore) {
    event.cookies.set(visitCookie, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: event.url.protocol === "https:",
      httpOnly: true,
    });
  }

  return {
    form: await superValidate(valibot(loginSchema)),
    visitedBefore,
  };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await superValidate(event.request, valibot(loginSchema));
    if (!form.valid) return fail(400, { form });

    const { usuario, contrasenia } = form.data;
    // Id estable de este navegador (cookie persistente). Permite al backend
    // reconocer el dispositivo y agrupar/mostrar sesiones. No es credencial.
    const uid_dispositivo = getOrCreateDeviceId(event);
    let response: Response;
    try {
      response = await requestBackend(event, "/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Solo credenciales + id de dispositivo. La organización la deduce el
        // backend desde el host (reenviado en X-Forwarded-Host por requestBackend).
        body: JSON.stringify({
          usuario,
          contrasenia,
          uid_dispositivo,
          plataforma: "web",
        }),
      });
    } catch {
      return message(form, "login.serviceUnavailable", { status: 503 });
    }

    if (!response.ok) {
      const isAuthError = response.status === 401 || response.status === 403;
      return message(
        form,
        isAuthError ? "login.invalidCredentials" : "login.serviceUnavailable",
        {
          status: isAuthError ? 400 : 502,
        },
      );
    }

    try {
      const body = await response.json();
      const usuario = parseUserContext(body.usuario);
      applyPreferenceCookies(event.cookies, event.url, usuario.preferencias);
      copyAuthCookies(
        response.headers,
        event.cookies,
        event.url.protocol === "https:",
      );
    } catch {
      // Login succeeded on the backend but copying the auth cookies failed:
      // surface a friendly message instead of a raw 500.
      return message(form, "login.serviceUnavailable", { status: 502 });
    }

    // redirect() works by throwing; it MUST stay outside the try/catch above,
    // otherwise the catch would swallow it and break the navigation.
    redirect(303, "/dashboard");
  },
};
