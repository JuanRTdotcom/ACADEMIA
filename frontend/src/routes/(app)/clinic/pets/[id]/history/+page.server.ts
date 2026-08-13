import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { UUID } from "$lib/server/companies";
import { attentionRequest } from "$lib/server/attentions";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  if (!UUID.test(event.params.id)) error(404, "pets.notFound");
  try {
    const historial = await attentionRequest(
      event,
      `/clinic/attentions/pets/${event.params.id}/history`,
    );
    return { ...historial, usuario };
  } catch (cause) {
    error(
      (cause as { status?: number }).status ?? 503,
      (cause as { message?: string }).message ?? "pets.historyLoadError",
    );
  }
};
