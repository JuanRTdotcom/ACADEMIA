import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  companyMessage,
  companyRequest,
  formText,
  UUID,
} from "$lib/server/companies";
import { ownerPermission } from "$lib/server/owners";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  const q = event.url.searchParams.get("q")?.trim().slice(0, 220) ?? "";
  const p = event.url.searchParams.get("p")?.slice(0, 1000) ?? "";
  try {
    const response = await companyRequest(
      event,
      `/clinic/owners?${new URLSearchParams({ ...(q ? { q } : {}), ...(p ? { p } : {}) })}`,
    );
    if (!response.ok)
      error(
        response.status,
        await companyMessage(response, "owners.loadError"),
      );
    return { ...(await response.json()), usuario, q };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "owners.serviceUnavailable");
  }
};

export const actions: Actions = {
  delete: async (event) => {
    if (!(await ownerPermission(event, "clinic.owners.delete")))
      return fail(403, { ownerMessage: "owners.permissionDenied" });
    const form = await event.request.formData();
    const id = formText(form, "id");
    if (!UUID.test(id))
      return fail(400, { ownerMessage: "owners.invalidData" });
    const confirmarDesvinculacion =
      form.get("confirmar_desvinculacion") === "true";
    const response = await companyRequest(event, `/clinic/owners/${id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        confirmarDesvinculacion ? { confirmar_desvinculacion: true } : {},
      ),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        codigo?: unknown;
        message?: unknown;
        data?: unknown;
      } | null;
      return fail(response.status, {
        ownerMessage:
          typeof body?.message === "string"
            ? body.message
            : "owners.deleteError",
        ...(body?.codigo === "owners.petsResolutionRequired" && body.data
          ? { ownerImpact: body.data }
          : {}),
      });
    }
    return { ownerMessage: "owners.deleted" };
  },
};
