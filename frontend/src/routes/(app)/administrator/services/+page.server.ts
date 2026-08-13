import { error, fail, type Actions, type RequestEvent } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  companyMessage,
  companyRequest,
  formText,
  UUID,
} from "$lib/server/companies";
import { tienePermiso } from "$lib/permissions-client";
import { requestBackend } from "$lib/server/backend";
import { parseUserContext } from "$lib/server/user-context";
import {
  mutateService,
  servicePayload,
  validService,
} from "$lib/server/veterinary-services";

async function obtenerUsuario(event: RequestEvent) {
  const response = await requestBackend(event, "/auth/me");
  return response.ok ? parseUserContext(await response.json()) : null;
}

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  try {
    const query = new URLSearchParams();
    const position = event.url.searchParams.get("p");
    const search = event.url.searchParams.get("q")?.trim() ?? "";
    if (position) query.set("p", position);
    if (search) query.set("q", search);
    const response = await companyRequest(
      event,
      `/company/services${query.size ? `?${query}` : ""}`,
    );
    if (!response.ok)
      error(
        response.status,
        await companyMessage(response, "services.loadError"),
      );
    return { ...(await response.json()), usuario, busqueda: search };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "services.serviceUnavailable");
  }
};

export const actions: Actions = {
  create: async (event) => {
    const usuario = await obtenerUsuario(event);
    if (
      !usuario ||
      !tienePermiso(usuario.permisos, "administrator.services.create")
    ) {
      return fail(403, { serviceMessage: "services.permissionDenied" });
    }
    const data = servicePayload(await event.request.formData());
    if (!validService(data))
      return fail(400, { serviceMessage: "services.invalidData" });
    return mutateService(event, "/company/services", "POST", data);
  },
  update: async (event) => {
    const usuario = await obtenerUsuario(event);
    if (
      !usuario ||
      !tienePermiso(usuario.permisos, "administrator.services.update")
    ) {
      return fail(403, { serviceMessage: "services.permissionDenied" });
    }
    const form = await event.request.formData();
    const id = formText(form, "id");
    const data = servicePayload(form);
    if (!UUID.test(id) || !validService(data)) {
      return fail(400, { serviceMessage: "services.invalidData" });
    }
    return mutateService(event, `/company/services/${id}`, "PATCH", data);
  },
  status: async (event) => {
    const usuario = await obtenerUsuario(event);
    if (
      !usuario ||
      !tienePermiso(usuario.permisos, "administrator.services.update")
    ) {
      return fail(403, { serviceMessage: "services.permissionDenied" });
    }
    const form = await event.request.formData();
    const id = formText(form, "id");
    const rawActive = formText(form, "activo");
    if (!UUID.test(id) || !["true", "false"].includes(rawActive)) {
      return fail(400, { serviceMessage: "services.invalidData" });
    }
    return mutateService(event, `/company/services/${id}/status`, "PATCH", {
      activo: rawActive === "true",
    });
  },
  delete: async (event) => {
    const usuario = await obtenerUsuario(event);
    if (
      !usuario ||
      !tienePermiso(usuario.permisos, "administrator.services.delete")
    ) {
      return fail(403, { serviceMessage: "services.permissionDenied" });
    }
    const id = formText(await event.request.formData(), "id");
    if (!UUID.test(id))
      return fail(400, { serviceMessage: "services.invalidData" });
    return mutateService(event, `/company/services/${id}`, "DELETE");
  },
};
