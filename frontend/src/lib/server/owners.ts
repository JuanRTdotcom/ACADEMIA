import { fail, redirect, type RequestEvent } from "@sveltejs/kit";
import { tienePermiso } from "$lib/permissions-client";
import { companyMessage, companyRequest, formText, UUID } from "./companies";
import { parseUserContext } from "./user-context";

const PHONE = /^\+?[0-9][0-9 .()\-]{5,29}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ownerPayload(form: FormData) {
  const sinCorreo = formText(form, "sin_correo") === "true";
  return {
    fid_parametros_tipo_documento: formText(
      form,
      "fid_parametros_tipo_documento",
    ),
    numero_documento: formText(form, "numero_documento"),
    nombre_completo: formText(form, "nombre_completo"),
    celular: formText(form, "celular"),
    celular_verificado: formText(form, "celular_verificado") === "true",
    sin_correo: sinCorreo,
    correo: sinCorreo ? "" : formText(form, "correo").toLowerCase(),
    correo_verificado:
      !sinCorreo && formText(form, "correo_verificado") === "true",
    telefono_fijo: formText(form, "telefono_fijo"),
    direccion: formText(form, "direccion"),
    fid_admin_level_0: formText(form, "fid_admin_level_0"),
    fid_admin_level_3: formText(form, "fid_admin_level_3"),
    contacto_alternativo_nombre: formText(form, "contacto_alternativo_nombre"),
    contacto_alternativo_telefono: formText(
      form,
      "contacto_alternativo_telefono",
    ),
    fid_parametros_como_conocio: formText(form, "fid_parametros_como_conocio"),
    como_conocio_otro: formText(form, "como_conocio_otro"),
  };
}

export function validOwner(body: ReturnType<typeof ownerPayload>) {
  const alternateComplete =
    Boolean(body.contacto_alternativo_nombre) ===
    Boolean(body.contacto_alternativo_telefono);
  return (
    UUID.test(body.fid_parametros_tipo_documento) &&
    /^[\p{L}\p{N}.\-]{3,40}$/u.test(body.numero_documento) &&
    /^[\p{L}\p{M}' .\-]{2,150}$/u.test(body.nombre_completo) &&
    (!body.celular || PHONE.test(body.celular)) &&
    (!body.celular_verificado || Boolean(body.celular)) &&
    (body.sin_correo
      ? !body.correo && !body.correo_verificado
      : (!body.correo || EMAIL.test(body.correo)) &&
        body.correo.length <= 254 &&
        (!body.correo_verificado || Boolean(body.correo))) &&
    (!body.telefono_fijo || PHONE.test(body.telefono_fijo)) &&
    (!body.direccion || body.direccion.length >= 3) &&
    body.direccion.length <= 200 &&
    (!body.fid_admin_level_0 || UUID.test(body.fid_admin_level_0)) &&
    (!body.fid_admin_level_3 ||
      (UUID.test(body.fid_admin_level_3) &&
        UUID.test(body.fid_admin_level_0))) &&
    alternateComplete &&
    body.contacto_alternativo_nombre.length <= 150 &&
    (!body.contacto_alternativo_telefono ||
      PHONE.test(body.contacto_alternativo_telefono)) &&
    (!body.fid_parametros_como_conocio ||
      UUID.test(body.fid_parametros_como_conocio)) &&
    body.como_conocio_otro.length <= 150
  );
}

export async function ownerPermission(event: RequestEvent, permission: string) {
  const response = await companyRequest(event, "/auth/me");
  if (!response.ok) return false;
  return tienePermiso(
    parseUserContext(await response.json()).permisos,
    permission,
  );
}

export async function loadOwnerOptions(event: RequestEvent) {
  const response = await companyRequest(event, "/clinic/owners/options");
  if (!response.ok)
    throw {
      status: response.status,
      message: await companyMessage(response, "owners.loadError"),
    };
  return response.json();
}

export async function saveOwner(
  event: RequestEvent,
  route: string,
  method: "POST" | "PATCH",
  permission: string,
  redirectTo: string | null = "/clinic/owners",
) {
  if (!(await ownerPermission(event, permission)))
    return fail(403, { ownerMessage: "owners.permissionDenied" });
  const body = ownerPayload(await event.request.formData());
  if (!validOwner(body))
    return fail(400, { ownerMessage: "owners.invalidData", values: body });
  try {
    const response = await companyRequest(event, route, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok)
      return fail(response.status, {
        ownerMessage: await companyMessage(response, "owners.saveError"),
        values: body,
      });
  } catch {
    return fail(503, {
      ownerMessage: "owners.serviceUnavailable",
      values: body,
    });
  }
  if (redirectTo) redirect(303, redirectTo);
  return { ownerSaved: true };
}
