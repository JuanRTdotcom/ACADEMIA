import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  companyMessage,
  companyRequest,
  formText,
  UUID,
} from "$lib/server/companies";

export const load: PageServerLoad = async (event) => {
  await event.parent();
  const response = await companyRequest(event, "/company/current/branches");
  if (!response.ok)
    error(
      response.status,
      await companyMessage(response, "companies.loadError"),
    );
  return response.json();
};

const payload = (form: FormData) => ({
  codigo: formText(form, "codigo").toUpperCase(),
  nombre: formText(form, "nombre"),
});

export const actions: Actions = {
  save: async (event) => {
    const form = await event.request.formData();
    const id = formText(form, "id_sedes");
    if (id && !UUID.test(id))
      return fail(400, { message: "companies.branches.invalid" });
    const response = await companyRequest(
      event,
      `/company/current/branches${id ? `/${id}` : ""}`,
      {
        method: id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload(form)),
      },
    );
    if (!response.ok)
      return fail(response.status, {
        message: await companyMessage(response, "companies.saveError"),
      });
    return {
      message: id ? "companies.branches.updated" : "companies.branches.created",
    };
  },
  delete: async (event) => {
    const id = formText(await event.request.formData(), "id_sedes");
    if (!UUID.test(id))
      return fail(400, { message: "companies.branches.invalid" });
    const response = await companyRequest(
      event,
      `/company/current/branches/${id}`,
      { method: "DELETE" },
    );
    if (!response.ok)
      return fail(response.status, {
        message: await companyMessage(response, "companies.saveError"),
      });
    return { message: "companies.branches.deleted" };
  },
};
