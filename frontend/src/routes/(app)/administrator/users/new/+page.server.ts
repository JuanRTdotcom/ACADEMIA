import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  UUID,
  companyMessage,
  companyRequest,
  formText,
} from "$lib/server/companies";
import { tienePermiso } from "$lib/permissions-client";

import { requestBackend } from "$lib/server/backend";
import { parseUserContext } from "$lib/server/user-context";

async function obtenerUsuario(event: any) {
  const res = await requestBackend(event, "/auth/me");
  if (!res.ok) throw error(401, "unauthorized");
  return parseUserContext(await res.json());
}

const NAME = /^[\p{L}][\p{L}\s'\-]*$/u;
const USERNAME = /^[A-Z0-9]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/;

function body(form: FormData) {
  return {
    fid_organizaciones: formText(form, "fid_organizaciones"),
    usuario: formText(form, "usuario").toUpperCase(),
    nombres: formText(form, "nombres"),
    apellido_paterno: formText(form, "apellido_paterno"),
    apellido_materno: formText(form, "apellido_materno"),
    correo: formText(form, "correo").toLowerCase(),
    contrasenia_temporal: String(form.get("contrasenia_temporal") ?? ""),
    confirmacion_contrasenia: String(
      form.get("confirmacion_contrasenia") ?? "",
    ),
    fid_roles: form.getAll("fid_roles").map(String),
    fid_permisos: form.getAll("fid_permisos").map(String),
    fid_sedes: form.getAll("fid_sedes").map(String),
  };
}

function validationError(data: ReturnType<typeof body>): string | null {
  if (!UUID.test(data.fid_organizaciones)) return "users.validation.required";
  if (
    !USERNAME.test(data.usuario) ||
    data.usuario.length < 3 ||
    data.usuario.length > 12
  )
    return "users.validation.username";
  if (
    ![data.nombres, data.apellido_paterno, data.apellido_materno].every(
      (value, index) =>
        value.length >= 2 &&
        value.length <= (index === 0 ? 50 : 30) &&
        NAME.test(value),
    )
  )
    return "users.validation.name";
  if (data.correo.length > 254 || !EMAIL.test(data.correo))
    return "users.validation.email";
  if (
    data.fid_roles.length === 0 ||
    data.fid_roles.length > 20 ||
    !data.fid_roles.every((id) => UUID.test(id))
  )
    return "users.validation.roles";
  if (
    data.fid_permisos.length > 500 ||
    new Set(data.fid_permisos).size !== data.fid_permisos.length ||
    !data.fid_permisos.every((id) => UUID.test(id))
  )
    return "users.validation.permissions";
  if (
    data.fid_sedes.length === 0 ||
    data.fid_sedes.length > 100 ||
    new Set(data.fid_sedes).size !== data.fid_sedes.length ||
    !data.fid_sedes.every((id) => UUID.test(id))
  )
    return "users.validation.branches";
  if (
    data.contrasenia_temporal.length < 8 ||
    data.contrasenia_temporal.length > 20 ||
    !PASSWORD.test(data.contrasenia_temporal)
  )
    return "users.validation.password";
  if (data.contrasenia_temporal !== data.confirmacion_contrasenia)
    return "users.validation.passwordMatch";
  return null;
}

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  if (!tienePermiso(usuario.permisos, "administrator.users.create")) {
    redirect(303, "/dashboard");
  }
  try {
    const response = await companyRequest(
      event,
      "/company/current/users/creation-options",
    );
    if (!response.ok) {
      error(response.status, await companyMessage(response, "users.loadError"));
    }
    return await response.json();
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "users.serviceUnavailable");
  }
};

export const actions: Actions = {
  create: async (event) => {
    const usuario = await obtenerUsuario(event);
    if (!tienePermiso(usuario.permisos, "administrator.users.create")) {
      return fail(403, { userMessage: "users.permissionDenied" });
    }
    const payload = body(await event.request.formData());
    // Forzar la empresa del usuario logueado en el server para mayor seguridad
    payload.fid_organizaciones = usuario.fid_organizaciones;
    const userMessage = validationError(payload);
    if (userMessage) return fail(400, { userMessage });
    try {
      const response = await companyRequest(event, "/company/current/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        return fail(response.status, {
          userMessage: await companyMessage(response, "users.saveError"),
        });
      }
      return { userMessage: "users.created" };
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause) throw cause;
      return fail(503, { userMessage: "users.serviceUnavailable" });
    }
  },
};
