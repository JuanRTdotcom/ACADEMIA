import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { companyMessage, companyRequest, UUID } from "$lib/server/companies";

export const GET: RequestHandler = async (event) => {
  if (!UUID.test(event.params.id) || !UUID.test(event.params.type))
    return json({ message: "attentions.invalidData" }, { status: 400 });
  const response = await companyRequest(
    event,
    `/clinic/attentions/pets/${event.params.id}/records/${event.params.type}/latest`,
  );
  if (!response.ok)
    return json(
      { message: await companyMessage(response, "attentions.loadError") },
      { status: response.status },
    );
  return json(await response.json());
};
