import { error, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { companyMessage, companyRequest, UUID } from "$lib/server/companies";
import { loadPetOptions, savePet } from "$lib/server/pets";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  if (!UUID.test(event.params.id)) error(404, "pets.notFound");
  try {
    const [opciones, response] = await Promise.all([loadPetOptions(event), companyRequest(event, `/clinic/pets/${event.params.id}`)]);
    if (!response.ok) error(response.status, await companyMessage(response, "pets.notFound"));
    return { opciones, ...(await response.json()), usuario };
  } catch (cause) { if (cause && typeof cause === "object" && "status" in cause) throw cause; error(503, "pets.serviceUnavailable"); }
};
export const actions: Actions = { default: (event) => savePet(event, `/clinic/pets/${event.params.id}`, "PATCH", "clinic.pets.update", true) };
