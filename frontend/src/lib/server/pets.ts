import { fail, redirect, type RequestEvent } from "@sveltejs/kit";
import { tienePermiso } from "$lib/permissions-client";
import { companyMessage, companyRequest, UUID } from "./companies";
import { serverConfig } from "./config";
import { parseUserContext } from "./user-context";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const WEIGHT = /^\d{1,5}(?:\.\d{1,3})?$/;

export async function petPermission(event: RequestEvent, permission: string) {
  const response = await companyRequest(event, "/auth/me");
  return (
    response.ok &&
    tienePermiso(parseUserContext(await response.json()).permisos, permission)
  );
}

export async function loadPetOptions(event: RequestEvent) {
  const response = await companyRequest(event, "/clinic/pets/options");
  if (!response.ok)
    throw {
      status: response.status,
      message: await companyMessage(response, "pets.loadError"),
    };
  return response.json();
}

function validPet(form: FormData, editing: boolean) {
  const file = form.get("foto");
  const removePhotoValue = String(form.get("eliminar_foto") ?? "false");
  const removePhoto = removePhotoValue === "true";
  const owner = String(form.get("fid_propietarios") ?? "");
  const withoutOwnerValue = String(form.get("sin_propietario") ?? "false");
  const withoutOwner = withoutOwnerValue === "true";
  const date = String(form.get("fecha_nacimiento") ?? "");
  const weight = String(form.get("peso") ?? "");
  const breed = String(form.get("fid_razas_animales") ?? "");
  const subspecies = String(form.get("fid_subespecies_animales") ?? "");
  const text = (name: string, min: number, max: number) => {
    const value = String(form.get(name) ?? "").trim();
    return value.length >= min && value.length <= max;
  };
  const uuid = (name: string) => UUID.test(String(form.get(name) ?? ""));
  const optionalUuid = (name: string) => {
    const value = String(form.get(name) ?? "");
    return !value || UUID.test(value);
  };
  const photoOk =
    file instanceof File &&
    (file.size === 0
      ? editing || !removePhoto
      : !removePhoto &&
        file.size <= serverConfig.avatarMaxBytes &&
        ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
          file.type,
        ));
  return (
    (removePhotoValue === "true" || removePhotoValue === "false") &&
    (withoutOwnerValue === "true" || withoutOwnerValue === "false") &&
    photoOk &&
    Boolean(owner) !== withoutOwner &&
    (!owner || UUID.test(owner)) &&
    text("nombre", 1, 120) &&
    text("codigo_chip", 0, 50) &&
    uuid("fid_especies_animales") &&
    ((!breed && !subspecies) || UUID.test(breed) !== UUID.test(subspecies)) &&
    uuid("fid_parametros_genero") &&
    optionalUuid("fid_parametros_color") &&
    (!date ||
      (DATE.test(date) &&
        date >= "1900-01-01" &&
        date <= new Date().toISOString().slice(0, 10))) &&
    (!weight || (WEIGHT.test(weight) && Number(weight) > 0)) &&
    optionalUuid("fid_parametros_unidad_peso") &&
    optionalUuid("fid_parametros_talla") &&
    optionalUuid("fid_parametros_estado_reproductivo") &&
    optionalUuid("fid_parametros_temperamento") &&
    text("alimento", 0, 250)
  );
}

export async function savePet(
  event: RequestEvent,
  route: string,
  method: "POST" | "PATCH",
  permission: string,
  editing = false,
  redirectTo: string | null = "/clinic/pets",
) {
  if (!(await petPermission(event, permission)))
    return fail(403, { petMessage: "pets.permissionDenied" });
  const form = await event.request.formData();
  if (!validPet(form, editing))
    return fail(400, { petMessage: "pets.invalidData" });
  try {
    const response = await companyRequest(event, route, { method, body: form });
    if (!response.ok)
      return fail(response.status, {
        petMessage: await companyMessage(response, "pets.saveError"),
      });
  } catch {
    return fail(503, { petMessage: "pets.serviceUnavailable" });
  }
  if (redirectTo) redirect(303, redirectTo);
  return { petSaved: true };
}
