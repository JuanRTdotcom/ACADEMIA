import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { companyMessage, companyRequest, formText, UUID } from "$lib/server/companies";
import { ownerPermission } from "$lib/server/owners";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  const q = event.url.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  try {
    const response = await companyRequest(event, `/clinic/owners${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (!response.ok) error(response.status, await companyMessage(response, "owners.loadError"));
    return { ...(await response.json()), usuario, q };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "owners.serviceUnavailable");
  }
};

export const actions: Actions = {
  delete: async (event) => {
    if (!(await ownerPermission(event, "clinic.owners.delete"))) return fail(403, { ownerMessage: "owners.permissionDenied" });
    const id = formText(await event.request.formData(), "id");
    if (!UUID.test(id)) return fail(400, { ownerMessage: "owners.invalidData" });
    const response = await companyRequest(event, `/clinic/owners/${id}`, { method: "DELETE" });
    if (!response.ok) return fail(response.status, { ownerMessage: await companyMessage(response, "owners.deleteError") });
    return { ownerMessage: "owners.deleted" };
  },
};
