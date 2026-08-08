import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { UUID, companyMessage, companyRequest } from "$lib/server/companies";

/** La pantalla se llena en SSR; no usa una petición de cliente al abrirse. */
export const load: PageServerLoad = async (event) => {
  await event.parent();
  const { id } = event.params;
  if (!UUID.test(id)) error(404, "roles.notFound");
  try {
    const response = await companyRequest(event, `/roles/${id}/permissions`);
    if (!response.ok)
      error(response.status, await companyMessage(response, "roles.loadError"));
    return await response.json();
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "roles.serviceUnavailable");
  }
};

export const actions: Actions = {
  save: async (event) => {
    const { id } = event.params;
    const form = await event.request.formData();
    const permisos = form.getAll("permisos").map(String);
    if (!UUID.test(id) || !permisos.every((permiso) => UUID.test(permiso))) {
      return fail(400, { roleMessage: "roles.invalidPermissions" });
    }
    try {
      const response = await companyRequest(event, `/roles/${id}/permissions`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permisos }),
      });
      if (!response.ok) {
        return fail(response.status, { roleMessage: await companyMessage(response, "roles.permissionsSaveError") });
      }
      return { roleMessage: "roles.permissionsUpdated" };
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause) throw cause;
      return fail(503, { roleMessage: "roles.serviceUnavailable" });
    }
  },
};
