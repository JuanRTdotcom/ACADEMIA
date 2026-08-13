import { error, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { tienePermiso } from "$lib/permissions-client";
import { attentionRequest, changeAttentionStatus, removeAttention } from "$lib/server/attentions";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  const q = event.url.searchParams.get("q")?.trim().slice(0, 220) ?? "";
  const p = event.url.searchParams.get("p")?.slice(0, 1000) ?? "";
  const incluirAyer = event.url.searchParams.get("incluir_ayer") === "1";
  try {
    const canUpdate = tienePermiso(usuario.permisos, "clinic.attentions.update");
    const filtros = new URLSearchParams();
    if (q) filtros.set("q", q);
    if (p) filtros.set("p", p);
    if (incluirAyer) filtros.set("incluir_ayer", "1");
    const [listado, opciones] = await Promise.all([
      attentionRequest(event, `/clinic/attentions${filtros.size ? `?${filtros}` : ""}`),
      canUpdate ? attentionRequest(event, "/clinic/attentions/options") : Promise.resolve({ estados: [] }),
    ]);
    return { ...listado, estados: opciones.estados, usuario, q, incluirAyer };
  }
  catch (cause) { error((cause as { status?: number }).status ?? 503, (cause as { message?: string }).message ?? "attentions.loadError"); }
};

export const actions: Actions = { status: changeAttentionStatus, delete: removeAttention };
