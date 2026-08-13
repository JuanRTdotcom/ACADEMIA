import { error, fail, type Actions, type RequestEvent } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { attentionPermission } from "$lib/server/attentions";
import { companyMessage, companyRequest, formText, UUID } from "$lib/server/companies";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  const query = new URLSearchParams(); const position = event.url.searchParams.get("p"); const search = event.url.searchParams.get("q")?.trim() ?? "";
  if (position) query.set("p", position); if (search) query.set("q", search);
  const response = await companyRequest(event, `/company/diagnostic-studies${query.size ? `?${query}` : ""}`);
  if (!response.ok) error(response.status, await companyMessage(response, "diagnosticStudies.loadError"));
  return { ...(await response.json()), usuario, busqueda: search };
};

async function mutate(event: RequestEvent, permission: string, path: string, method: string, data?: object) {
  if (!(await attentionPermission(event, permission))) return fail(403, { diagnosticStudyMessage: "diagnosticStudies.permissionDenied" });
  const response = await companyRequest(event, path, { method, ...(data ? { headers: { "content-type": "application/json" }, body: JSON.stringify(data) } : {}) });
  if (!response.ok) return fail(response.status, { diagnosticStudyMessage: await companyMessage(response, "diagnosticStudies.saveError") });
  return { diagnosticStudyMessage: "diagnosticStudies.saved" };
}

function payload(form: FormData) {
  const nombre = formText(form, "nombre");
  return nombre.length >= 2 && nombre.length <= 160 ? { nombre } : null;
}

export const actions: Actions = {
  create: async (event) => { const data = payload(await event.request.formData()); return data ? mutate(event, "administrator.diagnostic_studies.create", "/company/diagnostic-studies", "POST", data) : fail(400, { diagnosticStudyMessage: "diagnosticStudies.invalidData" }); },
  update: async (event) => { const form = await event.request.formData(); const id = formText(form, "id"); const data = payload(form); return UUID.test(id) && data ? mutate(event, "administrator.diagnostic_studies.update", `/company/diagnostic-studies/${id}`, "PATCH", data) : fail(400, { diagnosticStudyMessage: "diagnosticStudies.invalidData" }); },
  status: async (event) => { const form = await event.request.formData(); const id = formText(form, "id"); const activo = formText(form, "activo"); return UUID.test(id) && ["true", "false"].includes(activo) ? mutate(event, "administrator.diagnostic_studies.update", `/company/diagnostic-studies/${id}/status`, "PATCH", { activo: activo === "true" }) : fail(400, { diagnosticStudyMessage: "diagnosticStudies.invalidData" }); },
  delete: async (event) => { const id = formText(await event.request.formData(), "id"); return UUID.test(id) ? mutate(event, "administrator.diagnostic_studies.delete", `/company/diagnostic-studies/${id}`, "DELETE") : fail(400, { diagnosticStudyMessage: "diagnosticStudies.invalidData" }); },
};
