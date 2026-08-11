import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { companyMessage, companyRequest, UUID } from "$lib/server/companies";

export const GET: RequestHandler = async (event) => {
  const owner = event.url.searchParams.get("owner") ?? "";
  if (!UUID.test(owner)) return json({ mascotas: [] }, { status: 400 });
  const response = await companyRequest(event, `/clinic/attentions/owners/${owner}/pets`);
  if (!response.ok) return json({ message: await companyMessage(response, "attentions.loadError") }, { status: response.status });
  return json(await response.json());
};
