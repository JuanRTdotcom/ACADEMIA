import { json, type RequestHandler } from "@sveltejs/kit";
import { companyMessage, companyRequest } from "$lib/server/companies";

export const PATCH: RequestHandler = async (event) => {
  if (!event.locals.isAuthenticated) {
    return json({ message: "auth.unauthorized" }, { status: 401 });
  }

  const input = (await event.request.json().catch(() => null)) as {
    login_usar_filtro_color?: unknown;
  } | null;
  if (
    !input ||
    Object.keys(input).length !== 1 ||
    typeof input.login_usar_filtro_color !== "boolean"
  ) {
    return json({ message: "companies.invalidData" }, { status: 400 });
  }

  const response = await companyRequest(
    event,
    "/company/current/login/color-filter",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    return json(
      { message: await companyMessage(response, "companies.saveError") },
      { status: response.status },
    );
  }
  return json(await response.json());
};
