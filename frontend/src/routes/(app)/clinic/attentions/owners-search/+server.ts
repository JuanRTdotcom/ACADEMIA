import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { companyMessage, companyRequest } from "$lib/server/companies";

export const GET: RequestHandler = async (event) => {
  const q = event.url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) return json({ propietarios: [] });
  const response = await companyRequest(event, `/clinic/attentions/owners?q=${encodeURIComponent(q)}`);
  if (!response.ok) return json({ message: await companyMessage(response, "attentions.loadError") }, { status: response.status });
  return json(await response.json());
};
