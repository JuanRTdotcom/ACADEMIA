import { error, json, type RequestHandler } from "@sveltejs/kit";
import { companyMessage, companyRequest } from "$lib/server/companies";

export const GET: RequestHandler = async (event) => {
  const query = event.url.searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 120) {
    return json(
      { servicios: [] },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  const response = await companyRequest(
    event,
    `/company/services/search?q=${encodeURIComponent(query)}`,
  );
  if (!response.ok) {
    error(
      response.status,
      await companyMessage(response, "services.searchError"),
    );
  }
  return json(await response.json(), {
    headers: { "cache-control": "private, no-store" },
  });
};
