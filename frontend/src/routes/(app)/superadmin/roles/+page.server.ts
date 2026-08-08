import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad, RequestEvent } from "./$types";
import {
  UUID,
  companyMessage,
  companyRequest,
  formText,
} from "$lib/server/companies";

const NAME = /^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-]*$/u;
const ALIAS = /^[A-Z][A-Z0-9_]*$/;
const ICONS = new Set([
  "shield",
  "shield-check",
  "user-cog",
  "users",
  "graduation-cap",
  "briefcase-business",
  "key-round",
  "badge-check",
]);

function roleBody(form: FormData) {
  return {
    nombre: formText(form, "nombre"),
    alias: formText(form, "alias").toUpperCase(),
    descripcion: formText(form, "descripcion"),
    icono: formText(form, "icono"),
  };
}
function validRole(body: ReturnType<typeof roleBody>) {
  return (
    body.nombre.length >= 2 &&
    body.nombre.length <= 80 &&
    NAME.test(body.nombre) &&
    body.descripcion.length >= 5 &&
    body.descripcion.length <= 250 &&
    /^[\p{L}\p{N}][\p{L}\p{N}\s&.,;:'"()¿?¡!/_\-]*$/u.test(
      body.descripcion,
    ) &&
    body.alias.length >= 2 &&
    body.alias.length <= 40 &&
    ALIAS.test(body.alias) &&
    ICONS.has(body.icono)
  );
}
async function mutation(
  event: RequestEvent,
  route: string,
  method: string,
  body?: object,
) {
  try {
    const response = await companyRequest(event, route, {
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
        roleMessage: await companyMessage(
          response,
          method === "DELETE" ? "roles.deleteError" : "roles.saveError",
        ),
      });
    return { roleMessage: "ok" };
  } catch {
    return fail(503, { roleMessage: "roles.serviceUnavailable" });
  }
}

export const load: PageServerLoad = async (event) => {
  await event.parent();
  try {
    const response = await companyRequest(event, "/roles");
    if (!response.ok)
      error(response.status, await companyMessage(response, "roles.loadError"));
    return await response.json();
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "roles.serviceUnavailable");
  }
};

export const actions: Actions = {
  create: async (event) => {
    const body = roleBody(await event.request.formData());
    if (!validRole(body))
      return fail(400, { roleMessage: "roles.invalidData" });
    return mutation(event, "/roles", "POST", body);
  },
  edit: async (event) => {
    const form = await event.request.formData();
    const id = formText(form, "id");
    const body = roleBody(form);
    if (!UUID.test(id) || !validRole(body))
      return fail(400, { roleMessage: "roles.invalidData" });
    return mutation(event, `/roles/${id}`, "PATCH", body);
  },
  status: async (event) => {
    const form = await event.request.formData();
    const id = formText(form, "id");
    const raw = form.get("activo");
    if (!UUID.test(id) || (raw !== "true" && raw !== "false"))
      return fail(400, { roleMessage: "roles.invalidData" });
    return mutation(event, `/roles/${id}/status`, "PATCH", {
      activo: raw === "true",
    });
  },
  delete: async (event) => {
    const id = formText(await event.request.formData(), "id");
    if (!UUID.test(id)) return fail(400, { roleMessage: "roles.invalidData" });
    return mutation(event, `/roles/${id}`, "DELETE");
  },
};
