import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { companyMessage, companyRequest } from "$lib/server/companies";

export const GET: RequestHandler = async (event) => {
  const q = event.url.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return json({ propietarios: [] });
  const response = await companyRequest(event, `/clinic/pets/owners?q=${encodeURIComponent(q)}`);
  if (!response.ok) return json({ message: await companyMessage(response, "pets.loadError") }, { status: response.status });
  return json(await response.json(), { headers: { "cache-control": "private, no-store" } });
};
