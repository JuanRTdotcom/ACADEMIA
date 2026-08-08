import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requestBackend } from "$lib/server/backend";

interface ActividadUsuario {
  eventos: {
    id_eventos: string;
    tipo_evento: string;
    ocurrido_en: string;
    agente_usuario: string | null;
  }[];
  paginacion: {
    pagina: number;
    limite: number;
    total: number;
    total_paginas: number;
  };
  zona_horaria: string;
  ahora: string;
}

/** La identidad ya fue validada por el layout; Nest vuelve a validarla en la ruta. */
export const load: PageServerLoad = async (event) => {
  await event.parent();

  const solicitada = Number(event.url.searchParams.get("pagina") ?? "1");
  const pagina =
    Number.isInteger(solicitada) && solicitada >= 1 && solicitada <= 10_000
      ? solicitada
      : 1;

  let response: Response;
  try {
    response = await requestBackend(
      event,
      `/profile/activity?pagina=${pagina}&limite=20`,
    );
  } catch {
    error(503, "profile.activity.loadError");
  }

  if (response.status === 401) redirect(303, "/login");
  if (!response.ok) error(response.status, "profile.activity.loadError");

  const actividad = (await response.json()) as ActividadUsuario;
  if (
    pagina > 1 &&
    (actividad.paginacion.total_paginas === 0 ||
      pagina > actividad.paginacion.total_paginas)
  ) {
    redirect(
      303,
      `/profile/activity?pagina=${Math.max(1, actividad.paginacion.total_paginas)}`,
    );
  }

  return actividad;
};
