import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { companyMessage, companyRequest, formText, UUID } from "$lib/server/companies";
import { petPermission } from "$lib/server/pets";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  const q = event.url.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  try {
    const response = await companyRequest(event, `/clinic/pets${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (!response.ok) error(response.status, await companyMessage(response, "pets.loadError"));
    return { ...(await response.json()), usuario, q };
  } catch (cause) { if (cause && typeof cause === "object" && "status" in cause) throw cause; error(503, "pets.serviceUnavailable"); }
};

export const actions: Actions = { delete: async (event) => {
  if (!(await petPermission(event, "clinic.pets.delete"))) return fail(403, { petMessage: "pets.permissionDenied" });
  const id = formText(await event.request.formData(), "id");
  if (!UUID.test(id)) return fail(400, { petMessage: "pets.invalidData" });
  const response = await companyRequest(event, `/clinic/pets/${id}`, { method: "DELETE" });
  if (!response.ok) return fail(response.status, { petMessage: await companyMessage(response, "pets.deleteError") });
  return { petMessage: "pets.deleted" };
} };
