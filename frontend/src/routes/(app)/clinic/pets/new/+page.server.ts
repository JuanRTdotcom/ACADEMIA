import { error, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { loadPetOptions, savePet } from "$lib/server/pets";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  try { return { opciones: await loadPetOptions(event), usuario }; }
  catch (cause) { error((cause as { status?: number }).status ?? 503, (cause as { message?: string }).message ?? "pets.serviceUnavailable"); }
};
export const actions: Actions = { default: (event) => savePet(event, "/clinic/pets", "POST", "clinic.pets.create") };
