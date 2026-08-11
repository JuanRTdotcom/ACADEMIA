import { error, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { companyMessage, companyRequest, UUID } from "$lib/server/companies";
import { loadOwnerOptions, saveOwner } from "$lib/server/owners";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  if (!UUID.test(event.params.id)) error(404, "owners.notFound");
  try {
    const [opciones, response] = await Promise.all([loadOwnerOptions(event), companyRequest(event, `/clinic/owners/${event.params.id}`)]);
    if (!response.ok) error(response.status, await companyMessage(response, "owners.notFound"));
    return { opciones, ...(await response.json()), usuario };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "owners.serviceUnavailable");
  }
};

export const actions: Actions = {
  default: (event) => saveOwner(event, `/clinic/owners/${event.params.id}`, "PATCH", "clinic.owners.update"),
};
