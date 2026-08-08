import { error, fail, redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";
import { personalSchema } from "$lib/schemas/personal";
import { serverConfig } from "$lib/server/config";

interface OpcionParametro {
  codigo: string;
  etiqueta: string;
  traducciones: Record<string, string>;
}

interface RespuestaPersonal {
  persona: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    codigo_sexo: string | null;
    codigo_estado_civil: string | null;
    codigo_nivel_instruccion: string | null;
    fecha_nacimiento: string | null;
    discapacidad: boolean;
    fid_admin_level_0_procedencia: string | null;
    codigo_admin_level_3_procedencia: string | null;
    fid_admin_level_0_residencia: string | null;
    codigo_admin_level_3_residencia: string | null;
    direccion: string | null;
    referencia: string | null;
  };
  catalogos: {
    sexos: OpcionParametro[];
    estados_civiles: OpcionParametro[];
    niveles_instruccion: OpcionParametro[];
    admin_level_0: {
      id_admin_level_0: string;
      codigo_iso2: string;
      nombre: string;
      etiqueta_admin_level_1: string;
      etiqueta_admin_level_2: string | null;
      etiqueta_admin_level_3: string;
    }[];
    admin_level_1: {
      id_admin_level_1: string;
      fid_admin_level_0: string;
      codigo: string;
      nombre: string;
    }[];
    admin_level_2: {
      id_admin_level_2: string;
      fid_admin_level_1: string;
      codigo: string;
      nombre: string;
    }[];
    admin_level_3: {
      fid_admin_level_1: string;
      fid_admin_level_2: string | null;
      codigo: string;
      nombre: string;
    }[];
  };
  roles: { codigo: string; nombre: string }[];
  avatar: { disponible: boolean; version: string | null };
}

async function mensajeBackend(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (typeof body?.message === "string" && body.message.trim())
    return body.message;
  if (Array.isArray(body?.message)) {
    const primero = body.message.find((item) => typeof item === "string");
    if (typeof primero === "string") return primero;
  }
  return fallback;
}

/** Sesión, persona, catálogos y roles terminan antes de renderizar la vista. */
export const load: PageServerLoad = async (event) => {
  await event.parent();

  let response: Response;
  try {
    response = await requestBackend(event, "/profile/personal");
  } catch {
    error(503, "profile.personal.loadError");
  }
  if (response.status === 401) redirect(303, "/login");
  if (!response.ok) error(response.status, "profile.personal.loadError");

  const perfil = (await response.json()) as RespuestaPersonal;
  const form = await superValidate(
    {
      ...perfil.persona,
      apellido_materno: perfil.persona.apellido_materno ?? "",
      codigo_sexo: perfil.persona.codigo_sexo ?? "",
      codigo_estado_civil: perfil.persona.codigo_estado_civil ?? "",
      codigo_nivel_instruccion: perfil.persona.codigo_nivel_instruccion ?? "",
      fecha_nacimiento: perfil.persona.fecha_nacimiento ?? "",
      discapacidad: perfil.persona.discapacidad,
      fid_admin_level_0_procedencia:
        perfil.persona.fid_admin_level_0_procedencia ?? "",
      codigo_admin_level_3_procedencia:
        perfil.persona.codigo_admin_level_3_procedencia ?? "",
      fid_admin_level_0_residencia:
        perfil.persona.fid_admin_level_0_residencia ?? "",
      codigo_admin_level_3_residencia:
        perfil.persona.codigo_admin_level_3_residencia ?? "",
      direccion: perfil.persona.direccion ?? "",
      referencia: perfil.persona.referencia ?? "",
    },
    valibot(personalSchema),
  );
  return { perfil, form, avatarMaxBytes: serverConfig.avatarMaxBytes };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await superValidate(event.request, valibot(personalSchema));
    if (!form.valid) return fail(400, { form });

    const payload = {
      ...form.data,
      codigo_sexo: form.data.codigo_sexo || null,
      codigo_estado_civil: form.data.codigo_estado_civil || null,
      codigo_nivel_instruccion: form.data.codigo_nivel_instruccion || null,
      fecha_nacimiento: form.data.fecha_nacimiento || null,
      discapacidad: form.data.discapacidad,
      fid_admin_level_0_procedencia:
        form.data.fid_admin_level_0_procedencia || null,
      codigo_admin_level_3_procedencia:
        form.data.codigo_admin_level_3_procedencia || null,
      fid_admin_level_0_residencia:
        form.data.fid_admin_level_0_residencia || null,
      codigo_admin_level_3_residencia:
        form.data.codigo_admin_level_3_residencia || null,
      direccion: form.data.direccion || null,
      referencia: form.data.referencia || null,
    };
    const guardar = () =>
      requestBackend(event, "/profile/personal", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

    let response: Response;
    try {
      response = await guardar();
      if (response.status === 401) {
        const refresco = await refreshBackendSession(event);
        if (!refresco.ok) redirect(303, "/login");
        copyAuthCookieValues(
          refresco.cookies,
          event.cookies,
          event.url.protocol === "https:",
        );
        response = await guardar();
      }
    } catch {
      return message(form, "profile.personal.saveError", { status: 503 });
    }

    if (response.status === 401) redirect(303, "/login");
    if (!response.ok) {
      const status =
        response.status === 429 ? 429 : response.status >= 500 ? 503 : 400;
      return message(
        form,
        await mensajeBackend(response, "profile.personal.saveError"),
        { status },
      );
    }

    return message(form, "profile.personal.saved");
  },
};
