import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { UUID, companyMessage, companyRequest } from "$lib/server/companies";

export const load: PageServerLoad = async (event) => {
  await event.parent();
  const { id } = event.params;
  if (!UUID.test(id)) error(404, "plans.notFound");
  try {
    const [planResponse, optionsResponse] = await Promise.all([
      companyRequest(event, `/plans/${id}`),
      companyRequest(event, `/plans/creation-options`),
    ]);
    if (!planResponse.ok)
      error(planResponse.status, await companyMessage(planResponse, "plans.loadError"));
    if (!optionsResponse.ok)
      error(optionsResponse.status, await companyMessage(optionsResponse, "plans.loadError"));

    const plan = await planResponse.json();
    const modulosDisponibles = await optionsResponse.json();

    return {
      plan,
      modulosDisponibles,
    };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "plans.serviceUnavailable");
  }
};

export const actions: Actions = {
  save: async (event) => {
    const { id } = event.params;
    const form = await event.request.formData();
    const fid_modulos = form.getAll("fid_modulos").map(String);
    if (!UUID.test(id) || !fid_modulos.every((fid) => UUID.test(fid))) {
      return fail(400, { planMessage: "plans.invalidData" });
    }
    try {
      const response = await companyRequest(event, `/plans/${id}/modules`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fid_modulos }),
      });
      if (!response.ok) {
        return fail(response.status, { planMessage: await companyMessage(response, "plans.saveError") });
      }
      return { planMessage: "plans.updated" };
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause) throw cause;
      return fail(503, { planMessage: "plans.serviceUnavailable" });
    }
  },
};
