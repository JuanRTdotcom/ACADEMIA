import { error, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { loadOwnerOptions, saveOwner } from "$lib/server/owners";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  try { return { opciones: await loadOwnerOptions(event), usuario }; }
  catch (cause) { error((cause as { status?: number }).status ?? 503, (cause as { message?: string }).message ?? "owners.serviceUnavailable"); }
};

export const actions: Actions = {
  default: (event) => saveOwner(event, "/clinic/owners", "POST", "clinic.owners.create"),
};
