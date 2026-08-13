import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { formText, UUID } from '$lib/server/companies';
import { operationCatalogs, operationMutation } from '$lib/server/operation-actions';

export const load: PageServerLoad = async (event) => ({ catalogos: await operationCatalogs(event) });

export const actions: Actions = {
  create: async (event) => {
    const form = await event.request.formData();
    const pet = event.params.id ?? '', type = formText(form, 'fid_parametros_tipo'), date = formText(form, 'realizado_en'), title = formText(form, 'titulo');
    if (!UUID.test(pet) || !UUID.test(type) || !date || title.length < 2) return fail(400, { operationMessage: 'operations.invalidData' });
    return operationMutation(event, '/operations/pet-documents', { fid_mascotas: pet, fid_parametros_tipo: type, titulo: title, entidad_emisora: formText(form, 'entidad_emisora'), realizado_en: new Date(date).toISOString(), observaciones: formText(form, 'observaciones') });
  }
};
