import { error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { companyMessage, companyRequest, UUID } from "$lib/server/companies";

export const load: LayoutServerLoad = async (event) => {
  const { usuario } = await event.parent();
  if (!UUID.test(event.params.id)) error(404, "pets.notFound");
  const response = await companyRequest(event, `/operations/pets/${event.params.id}/profile`);
  if (!response.ok) error(response.status, await companyMessage(response, "pets.loadError"));
  return { ...(await response.json()), usuario };
};
