import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  companyMessage,
  companyRequest,
  formText,
  UUID,
} from "$lib/server/companies";
import { petPermission } from "$lib/server/pets";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  const q = event.url.searchParams.get("q")?.trim().slice(0, 220) ?? "";
  const p = event.url.searchParams.get("p")?.slice(0, 1000) ?? "";
  try {
    const response = await companyRequest(
      event,
      `/clinic/pets?${new URLSearchParams({ ...(q ? { q } : {}), ...(p ? { p } : {}) })}`,
    );
    if (!response.ok)
      error(response.status, await companyMessage(response, "pets.loadError"));
    return { ...(await response.json()), usuario, q };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "pets.serviceUnavailable");
  }
};

export const actions: Actions = {
  delete: async (event) => {
    if (!(await petPermission(event, "clinic.pets.delete")))
      return fail(403, { petMessage: "pets.permissionDenied" });
    const form = await event.request.formData();
    const id = formText(form, "id");
    if (!UUID.test(id)) return fail(400, { petMessage: "pets.invalidData" });
    const confirmarDesvinculacion =
      form.get("confirmar_desvinculacion") === "true";
    const response = await companyRequest(event, `/clinic/pets/${id}`, {
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
        petMessage:
          typeof body?.message === "string" ? body.message : "pets.deleteError",
        ...(body?.codigo === "pets.ownerUnlinkConfirmationRequired" && body.data
          ? { petImpact: body.data }
          : {}),
      });
    }
    return { petMessage: "pets.deleted" };
  },
};
