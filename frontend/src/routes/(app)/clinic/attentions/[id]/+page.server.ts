import { error, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  addAttentionRecord,
  attentionRequest,
  createAttentionConsultationReason,
  createAttentionHospitalizationType,
  createAttentionLaboratoryTest,
  createAttentionProcedure,
  createAttentionVaccine,
  removeAttentionRecord,
} from "$lib/server/attentions";

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  try {
    const [detail, opciones] = await Promise.all([
      attentionRequest(event, `/clinic/attentions/${event.params.id}`),
      attentionRequest(event, "/clinic/attentions/options"),
    ]);
    return { ...detail, opciones, usuario };
  } catch (cause) {
    error(
      (cause as { status?: number }).status ?? 503,
      (cause as { message?: string }).message ?? "attentions.loadError",
    );
  }
};

export const actions: Actions = {
  record: (event) => addAttentionRecord(event, event.params.id ?? ""),
  deleteRecord: (event) => removeAttentionRecord(event, event.params.id ?? ""),
  vaccine: createAttentionVaccine,
  hospitalizationType: createAttentionHospitalizationType,
  procedure: createAttentionProcedure,
  consultationReason: createAttentionConsultationReason,
  laboratoryTest: createAttentionLaboratoryTest,
};
