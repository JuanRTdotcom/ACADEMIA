import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { companyMessage, companyRequest, UUID } from "$lib/server/companies";

export const POST: RequestHandler = async (event) => {
  const body = (await event.request.json().catch(() => null)) as {
    fid_sedes?: unknown;
  } | null;
  if (typeof body?.fid_sedes !== "string" || !UUID.test(body.fid_sedes)) {
    return json({ message: "companies.branches.invalid" }, { status: 400 });
  }
  const response = await companyRequest(
    event,
    "/company/current/active-branch",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fid_sedes: body.fid_sedes }),
    },
  );
  if (!response.ok) {
    return json(
      {
        message: await companyMessage(
          response,
          "companies.branches.selectError",
        ),
      },
      { status: response.status },
    );
  }
  return json({ ok: true });
};
