import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { companyMessage, companyRequest, UUID } from "$lib/server/companies";

export const GET: RequestHandler = async (event) => {
  if (!UUID.test(event.params.id)) return json({ message: "pets.notFound" }, { status: 404 });
  const response = await companyRequest(event, `/clinic/pets/${event.params.id}`);
  if (!response.ok) return json({ message: await companyMessage(response, "pets.notFound") }, { status: response.status });
  return json(await response.json());
};
