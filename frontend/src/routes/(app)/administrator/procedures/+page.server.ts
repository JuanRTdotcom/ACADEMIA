import { error, fail, type Actions, type RequestEvent } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { tienePermiso } from "$lib/permissions-client";
import {
  companyMessage,
  companyRequest,
  formText,
  UUID,
} from "$lib/server/companies";
import { parseUserContext } from "$lib/server/user-context";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  const response = await companyRequest(event, "/company/procedures");
  if (!response.ok)
    error(
      response.status,
      await companyMessage(response, "procedures.loadError"),
    );
  return { ...(await response.json()), usuario };
};

async function mutate(
  event: RequestEvent,
  permission: string,
  path: string,
  method: string,
  body?: object,
) {
  const auth = await companyRequest(event, "/auth/me");
  if (
    !auth.ok ||
    !tienePermiso(parseUserContext(await auth.json()).permisos, permission)
  )
    return fail(403, {
      procedureMessage: "procedures.permissionDenied",
    });
  const response = await companyRequest(event, path, {
    method,
    ...(body
      ? {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  if (!response.ok)
    return fail(response.status, {
      procedureMessage: await companyMessage(
        response,
        "procedures.saveError",
      ),
    });
  return { procedureMessage: "procedures.saved" };
}

function payload(form: FormData) {
  const nombre = formText(form, "nombre");
  const descripcion_guia = formText(form, "descripcion_guia");
  return nombre.length >= 2 && nombre.length <= 160 &&
    descripcion_guia.length >= 5 && descripcion_guia.length <= 1000
    ? { nombre, descripcion_guia }
    : null;
}

export const actions: Actions = {
  create: async (event) => {
    const data = payload(await event.request.formData());
    return data
      ? mutate(
          event,
          "administrator.procedures.create",
          "/company/procedures",
          "POST",
          data,
        )
      : fail(400, {
          procedureMessage: "procedures.invalidData",
        });
  },
  update: async (event) => {
    const form = await event.request.formData();
    const id = formText(form, "id");
    const data = payload(form);
    return UUID.test(id) && data
      ? mutate(
          event,
          "administrator.procedures.update",
          `/company/procedures/${id}`,
          "PATCH",
          data,
        )
      : fail(400, {
          procedureMessage: "procedures.invalidData",
        });
  },
  status: async (event) => {
    const form = await event.request.formData();
    const id = formText(form, "id");
    const activo = formText(form, "activo");
    return UUID.test(id) && ["true", "false"].includes(activo)
      ? mutate(
          event,
          "administrator.procedures.update",
          `/company/procedures/${id}/status`,
          "PATCH",
          { activo: activo === "true" },
        )
      : fail(400, {
          procedureMessage: "procedures.invalidData",
        });
  },
  delete: async (event) => {
    const id = formText(await event.request.formData(), "id");
    return UUID.test(id)
      ? mutate(
          event,
          "administrator.procedures.delete",
          `/company/procedures/${id}`,
          "DELETE",
        )
      : fail(400, {
          procedureMessage: "procedures.invalidData",
        });
  },
};
