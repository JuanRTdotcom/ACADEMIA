import { error, fail, type Actions, type RequestEvent } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { tienePermiso } from "$lib/permissions-client";
import { companyMessage, companyRequest, formText, UUID } from "$lib/server/companies";
import { parseUserContext } from "$lib/server/user-context";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  const response = await companyRequest(event, "/company/consultation-reasons");
  if (!response.ok) error(response.status, await companyMessage(response, "consultationReasons.loadError"));
  return { ...(await response.json()), usuario };
};

async function mutate(event: RequestEvent, permission: string, path: string, method: string, body?: object) {
  const auth = await companyRequest(event, "/auth/me");
  if (!auth.ok || !tienePermiso(parseUserContext(await auth.json()).permisos, permission)) return fail(403, { reasonMessage: "consultationReasons.permissionDenied" });
  const response = await companyRequest(event, path, { method, ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
  if (!response.ok) return fail(response.status, { reasonMessage: await companyMessage(response, "consultationReasons.saveError") });
  return { reasonMessage: "consultationReasons.saved" };
}

function payload(form: FormData) {
  const nombre = formText(form, "nombre");
  const descripcion = formText(form, "descripcion");
  return nombre.length >= 2 && nombre.length <= 120 && descripcion.length <= 500 ? { nombre, descripcion } : null;
}

export const actions: Actions = {
  create: async (event) => {
    const data = payload(await event.request.formData());
    return data ? mutate(event, "administrator.consultation_reasons.create", "/company/consultation-reasons", "POST", data) : fail(400, { reasonMessage: "consultationReasons.invalidData" });
  },
  update: async (event) => {
    const form = await event.request.formData(); const id = formText(form, "id"); const data = payload(form);
    return UUID.test(id) && data ? mutate(event, "administrator.consultation_reasons.update", `/company/consultation-reasons/${id}`, "PATCH", data) : fail(400, { reasonMessage: "consultationReasons.invalidData" });
  },
  status: async (event) => {
    const form = await event.request.formData(); const id = formText(form, "id"); const activo = formText(form, "activo");
    return UUID.test(id) && ["true", "false"].includes(activo) ? mutate(event, "administrator.consultation_reasons.update", `/company/consultation-reasons/${id}/status`, "PATCH", { activo: activo === "true" }) : fail(400, { reasonMessage: "consultationReasons.invalidData" });
  },
  delete: async (event) => {
    const id = formText(await event.request.formData(), "id");
    return UUID.test(id) ? mutate(event, "administrator.consultation_reasons.delete", `/company/consultation-reasons/${id}`, "DELETE") : fail(400, { reasonMessage: "consultationReasons.invalidData" });
  },
};
