import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  attentionRequest,
  createAttention,
  createAttentionConsultationReason,
  createAttentionHospitalizationType,
  createAttentionLaboratoryTest,
  createAttentionProcedure,
  createAttentionVaccine,
  createMinimalOwner,
  createMinimalPet,
} from "$lib/server/attentions";
import { UUID } from "$lib/server/companies";
import { saveOwner } from "$lib/server/owners";
import { savePet } from "$lib/server/pets";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  try {
    const [opciones, propietarios, mascotas] = await Promise.all([
      attentionRequest(event, "/clinic/attentions/options"),
      attentionRequest(event, "/clinic/owners/options"),
      attentionRequest(event, "/clinic/pets/options"),
    ]);
    return { opciones, propietarios, mascotas, usuario };
  } catch (cause) {
    error(
      (cause as { status?: number }).status ?? 503,
      (cause as { message?: string }).message ?? "attentions.loadError",
    );
  }
};

export const actions: Actions = {
  attention: createAttention,
  owner: createMinimalOwner,
  pet: createMinimalPet,
  editOwner: (event) => {
    const id = event.url.searchParams.get("owner") ?? "";
    if (!UUID.test(id)) return fail(400, { ownerMessage: "owners.notFound" });
    return saveOwner(
      event,
      `/clinic/owners/${id}`,
      "PATCH",
      "clinic.owners.update",
      null,
    );
  },
  editPet: (event) => {
    const id = event.url.searchParams.get("pet") ?? "";
    if (!UUID.test(id)) return fail(400, { petMessage: "pets.notFound" });
    return savePet(
      event,
      `/clinic/pets/${id}`,
      "PATCH",
      "clinic.pets.update",
      true,
      null,
    );
  },
  vaccine: createAttentionVaccine,
  hospitalizationType: createAttentionHospitalizationType,
  procedure: createAttentionProcedure,
  consultationReason: createAttentionConsultationReason,
  laboratoryTest: createAttentionLaboratoryTest,
};
