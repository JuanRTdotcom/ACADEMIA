import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad, RequestEvent } from "./$types";
import {
  copyAuthCookieValues,
  refreshBackendSession,
  requestBackend,
} from "$lib/server/backend";

interface Parametro {
  codigo: string;
  etiqueta: string;
  traducciones: Record<string, string>;
}
interface Realizado {
  id_personas_estudios_realizados: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  en_curso: boolean;
  codigo_nivel_instruccion: string;
  codigo_grado_obtenido: string;
  grado_obtenido_otro: string | null;
  codigo_profesion: string;
  profesion_otro: string | null;
  nivel_instruccion: Parametro;
  grado_obtenido: Parametro;
  profesion: Parametro;
}
interface Complementario {
  id_personas_estudios_complementarios: string;
  codigo_tipo_estudio: string;
  tipo_estudio_otro: string | null;
  nombre_estudio: string;
  institucion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  en_curso: boolean;
  tipo_estudio: Parametro;
}
interface RespuestaEstudios {
  realizados: Realizado[];
  complementarios: Complementario[];
  catalogos: {
    niveles_instruccion: Parametro[];
    grados_obtenidos: Parametro[];
    profesiones: Parametro[];
    tipos_estudio_complementario: Parametro[];
  };
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODIGO = /^[a-z0-9_]{1,80}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TEXTO = /^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]{1,149}$/u;

async function mensajeBackend(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  return typeof body?.message === "string" ? body.message : fallback;
}
async function solicitar(
  event: RequestEvent,
  ruta: string,
  init?: RequestInit,
) {
  let response = await requestBackend(event, ruta, init);
  if (response.status !== 401) return response;
  const refresco = await refreshBackendSession(event);
  if (!refresco.ok) redirect(303, "/login");
  copyAuthCookieValues(
    refresco.cookies,
    event.cookies,
    event.url.protocol === "https:",
  );
  response = await requestBackend(event, ruta, init);
  if (response.status === 401) redirect(303, "/login");
  return response;
}

export const load: PageServerLoad = async (event) => {
  await event.parent();
  try {
    const response = await solicitar(event, "/profile/studies");
    if (!response.ok)
      error(
        response.status,
        await mensajeBackend(response, "profile.studies.loadError"),
      );
    return (await response.json()) as RespuestaEstudios;
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "profile.studies.loadError");
  }
};

const texto = (form: FormData, clave: string) =>
  String(form.get(clave) ?? "")
    .trim()
    .replace(/\s+/g, " ");
function fechaValida(valor: string) {
  if (!FECHA.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}
function periodo(form: FormData) {
  const fecha_inicio = texto(form, "fecha_inicio");
  const fecha_fin = texto(form, "fecha_fin");
  const en_curso = form.get("en_curso") === "true";
  if (
    !fechaValida(fecha_inicio) ||
    (!en_curso && (!fechaValida(fecha_fin) || fecha_fin <= fecha_inicio)) ||
    (en_curso && Boolean(fecha_fin))
  )
    return null;
  return { fecha_inicio, ...(fecha_fin ? { fecha_fin } : {}), en_curso };
}
function leerRealizado(form: FormData) {
  const base = periodo(form);
  const codigo_nivel_instruccion = texto(form, "codigo_nivel_instruccion");
  const codigo_grado_obtenido = texto(form, "codigo_grado_obtenido");
  const codigo_profesion = texto(form, "codigo_profesion");
  const grado_obtenido_otro = texto(form, "grado_obtenido_otro");
  const profesion_otro = texto(form, "profesion_otro");
  if (
    !base ||
    ![codigo_nivel_instruccion, codigo_grado_obtenido, codigo_profesion].every(
      (v) => CODIGO.test(v),
    )
  )
    return null;
  if (
    (codigo_grado_obtenido === "otro") !== Boolean(grado_obtenido_otro) ||
    (grado_obtenido_otro && !TEXTO.test(grado_obtenido_otro))
  )
    return null;
  if (
    (codigo_profesion === "otro") !== Boolean(profesion_otro) ||
    (profesion_otro && !TEXTO.test(profesion_otro))
  )
    return null;
  return {
    codigo_nivel_instruccion,
    codigo_grado_obtenido,
    ...(grado_obtenido_otro ? { grado_obtenido_otro } : {}),
    codigo_profesion,
    ...(profesion_otro ? { profesion_otro } : {}),
    ...base,
  };
}
function leerComplementario(form: FormData) {
  const base = periodo(form);
  const codigo_tipo_estudio = texto(form, "codigo_tipo_estudio");
  const tipo_estudio_otro = texto(form, "tipo_estudio_otro");
  const nombre_estudio = texto(form, "nombre_estudio");
  const institucion = texto(form, "institucion");
  if (
    !base ||
    !CODIGO.test(codigo_tipo_estudio) ||
    !TEXTO.test(nombre_estudio) ||
    !TEXTO.test(institucion)
  )
    return null;
  if (
    (codigo_tipo_estudio === "otro") !== Boolean(tipo_estudio_otro) ||
    (tipo_estudio_otro && !TEXTO.test(tipo_estudio_otro))
  )
    return null;
  return {
    codigo_tipo_estudio,
    ...(tipo_estudio_otro ? { tipo_estudio_otro } : {}),
    nombre_estudio,
    institucion,
    ...base,
  };
}

async function mutar(
  event: RequestEvent,
  ruta: string,
  method: "POST" | "PATCH" | "DELETE",
  tipo: "academic" | "complementary",
) {
  const form =
    method === "DELETE" ? new FormData() : await event.request.formData();
  const body =
    method === "DELETE"
      ? undefined
      : tipo === "academic"
        ? leerRealizado(form)
        : leerComplementario(form);
  if (method !== "DELETE" && !body)
    return fail(400, { studiesMessage: "profile.studies.invalidData" });
  try {
    const response = await solicitar(event, ruta, {
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
        studiesMessage: await mensajeBackend(
          response,
          "profile.studies.saveError",
        ),
      });
    const resultado = (await response.json()) as Pick<
      RespuestaEstudios,
      "realizados" | "complementarios"
    >;
    return {
      studiesMessage: `profile.studies.${tipo}.${method === "POST" ? "added" : method === "PATCH" ? "updated" : "deleted"}`,
      ...resultado,
    };
  } catch {
    return fail(503, { studiesMessage: "profile.studies.saveError" });
  }
}
function idDe(form: FormData, clave: string) {
  const id = texto(form, clave);
  return UUID.test(id) ? id : null;
}

export const actions: Actions = {
  academicAdd: (event) =>
    mutar(event, "/profile/studies/academic", "POST", "academic"),
  academicEdit: async (event) => {
    const copia = event.request.clone();
    const id = idDe(await copia.formData(), "id");
    return id
      ? mutar(event, `/profile/studies/academic/${id}`, "PATCH", "academic")
      : fail(400, { studiesMessage: "profile.studies.notFound" });
  },
  academicDelete: async (event) => {
    const id = idDe(await event.request.formData(), "id");
    return id
      ? mutar(event, `/profile/studies/academic/${id}`, "DELETE", "academic")
      : fail(400, { studiesMessage: "profile.studies.notFound" });
  },
  complementaryAdd: (event) =>
    mutar(event, "/profile/studies/complementary", "POST", "complementary"),
  complementaryEdit: async (event) => {
    const copia = event.request.clone();
    const id = idDe(await copia.formData(), "id");
    return id
      ? mutar(
          event,
          `/profile/studies/complementary/${id}`,
          "PATCH",
          "complementary",
        )
      : fail(400, { studiesMessage: "profile.studies.notFound" });
  },
  complementaryDelete: async (event) => {
    const id = idDe(await event.request.formData(), "id");
    return id
      ? mutar(
          event,
          `/profile/studies/complementary/${id}`,
          "DELETE",
          "complementary",
        )
      : fail(400, { studiesMessage: "profile.studies.notFound" });
  },
};
