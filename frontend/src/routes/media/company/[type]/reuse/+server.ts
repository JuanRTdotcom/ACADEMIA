import { json, type RequestHandler } from "@sveltejs/kit";
import { companyMessage, companyRequest } from "$lib/server/companies";

const TYPES = new Set(["escudo", "imagotipo", "login_escudo"]);

export const PATCH: RequestHandler = async (event) => {
  const type = event.params.type ?? "";
  if (!TYPES.has(type)) {
    return json({ message: "companies.media.invalidRequest" }, { status: 400 });
  }
  const input = (await event.request.json().catch(() => null)) as {
    usar_misma_imagen?: unknown;
  } | null;
  if (typeof input?.usar_misma_imagen !== "boolean") {
    return json({ message: "companies.media.invalidRequest" }, { status: 400 });
  }
  const response = await companyRequest(
    event,
    `/company/current/media/${type}/reuse`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usar_misma_imagen: input.usar_misma_imagen }),
    },
  );
  if (!response.ok) {
    return json(
      { message: await companyMessage(response, "companies.media.saveError") },
      { status: response.status },
    );
  }
  return json(await response.json());
};
