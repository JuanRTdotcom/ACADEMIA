import { error, fail, type Actions, type RequestEvent } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { tienePermiso } from "$lib/permissions-client";
import { companyMessage, companyRequest, formText, UUID } from "$lib/server/companies";
import { parseUserContext } from "$lib/server/user-context";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  const query = new URLSearchParams();
  const position = event.url.searchParams.get("p");
  const search = event.url.searchParams.get("q")?.trim() ?? "";
  if (position) query.set("p", position);
  if (search) query.set("q", search);
  const response = await companyRequest(event, `/company/vaccines${query.size ? `?${query}` : ""}`);
  if (!response.ok) error(response.status, await companyMessage(response, "vaccines.loadError"));
  return { ...(await response.json()), usuario, busqueda: search };
};

async function mutate(event: RequestEvent, permission: string, path: string, method: string, body?: object) {
  const auth = await companyRequest(event, "/auth/me");
  if (!auth.ok || !tienePermiso(parseUserContext(await auth.json()).permisos, permission))
    return fail(403, { vaccineMessage: "vaccines.permissionDenied" });
  const response = await companyRequest(event, path, {
    method,
    ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) return fail(response.status, { vaccineMessage: await companyMessage(response, "vaccines.saveError") });
  return { vaccineMessage: "vaccines.saved" };
}

function payload(form: FormData) {
  const nombre = formText(form, "nombre");
  return nombre.length >= 2 && nombre.length <= 120 ? { nombre } : null;
}

export const actions: Actions = {
  create: async (event) => {
    const data = payload(await event.request.formData());
    return data ? mutate(event, "administrator.vaccines.create", "/company/vaccines", "POST", data) : fail(400, { vaccineMessage: "vaccines.invalidData" });
  },
  update: async (event) => {
    const form = await event.request.formData();
    const id = formText(form, "id");
    const data = payload(form);
    return UUID.test(id) && data ? mutate(event, "administrator.vaccines.update", `/company/vaccines/${id}`, "PATCH", data) : fail(400, { vaccineMessage: "vaccines.invalidData" });
  },
  status: async (event) => {
    const form = await event.request.formData();
    const id = formText(form, "id");
    const activo = formText(form, "activo");
    return UUID.test(id) && ["true", "false"].includes(activo) ? mutate(event, "administrator.vaccines.update", `/company/vaccines/${id}/status`, "PATCH", { activo: activo === "true" }) : fail(400, { vaccineMessage: "vaccines.invalidData" });
  },
  delete: async (event) => {
    const id = formText(await event.request.formData(), "id");
    return UUID.test(id) ? mutate(event, "administrator.vaccines.delete", `/company/vaccines/${id}`, "DELETE") : fail(400, { vaccineMessage: "vaccines.invalidData" });
  },
};
