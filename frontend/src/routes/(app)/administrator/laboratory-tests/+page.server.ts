import { error, fail, type Actions, type RequestEvent } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  companyMessage,
  companyRequest,
  formText,
  UUID,
} from "$lib/server/companies";
import { attentionPermission } from "$lib/server/attentions";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  const query = new URLSearchParams(); const position = event.url.searchParams.get("p"); const search = event.url.searchParams.get("q")?.trim() ?? "";
  if (position) query.set("p", position); if (search) query.set("q", search);
  const response = await companyRequest(event, `/company/laboratory-tests${query.size ? `?${query}` : ""}`);
  if (!response.ok)
    error(
      response.status,
      await companyMessage(response, "laboratoryTests.loadError"),
    );
  return { ...(await response.json()), usuario, busqueda: search };
};

async function mutate(
  event: RequestEvent,
  permission: string,
  path: string,
  method: string,
  data?: Record<string, unknown>,
) {
  if (!(await attentionPermission(event, permission)))
    return fail(403, {
      laboratoryTestMessage: "laboratoryTests.permissionDenied",
    });
  const response = await companyRequest(event, path, {
    method,
    ...(data
      ? {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        }
      : {}),
  });
  if (!response.ok)
    return fail(response.status, {
      laboratoryTestMessage: await companyMessage(
        response,
        "laboratoryTests.saveError",
      ),
    });
  return { laboratoryTestMessage: "laboratoryTests.saved" };
}

function data(form: FormData) {
  const fid_categorias_pruebas_laboratorio = formText(
    form,
    "fid_categorias_pruebas_laboratorio",
  );
  const nombre = formText(form, "nombre");
  return UUID.test(fid_categorias_pruebas_laboratorio) &&
    nombre.length >= 2 &&
    nombre.length <= 220
    ? { fid_categorias_pruebas_laboratorio, nombre }
    : null;
}

export const actions: Actions = {
  create: async (event) => {
    const value = data(await event.request.formData());
    return value
      ? mutate(
          event,
          "administrator.laboratory_tests.create",
          "/company/laboratory-tests",
          "POST",
          value,
        )
      : fail(400, { laboratoryTestMessage: "laboratoryTests.invalidData" });
  },
  update: async (event) => {
    const form = await event.request.formData();
    const id = formText(form, "id");
    const value = data(form);
    return UUID.test(id) && value
      ? mutate(
          event,
          "administrator.laboratory_tests.update",
          `/company/laboratory-tests/${id}`,
          "PATCH",
          value,
        )
      : fail(400, { laboratoryTestMessage: "laboratoryTests.invalidData" });
  },
  status: async (event) => {
    const form = await event.request.formData();
    const id = formText(form, "id");
    const activo = formText(form, "activo");
    return UUID.test(id) && ["true", "false"].includes(activo)
      ? mutate(
          event,
          "administrator.laboratory_tests.update",
          `/company/laboratory-tests/${id}/status`,
          "PATCH",
          { activo: activo === "true" },
        )
      : fail(400, { laboratoryTestMessage: "laboratoryTests.invalidData" });
  },
  delete: async (event) => {
    const id = formText(await event.request.formData(), "id");
    return UUID.test(id)
      ? mutate(
          event,
          "administrator.laboratory_tests.delete",
          `/company/laboratory-tests/${id}`,
          "DELETE",
        )
      : fail(400, { laboratoryTestMessage: "laboratoryTests.invalidData" });
  },
};
