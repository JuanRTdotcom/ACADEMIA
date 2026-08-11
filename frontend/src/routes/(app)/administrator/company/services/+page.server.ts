import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { companyMessage, companyRequest, formText, loadCompanySection, saveCompanySection } from '$lib/server/companies';

interface Services { fid_parametros_especies: string[]; }
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const load: PageServerLoad = async (event) => {
	await event.parent();
	const [section, response] = await Promise.all([loadCompanySection<Services>(event, 'services'), companyRequest(event, '/company/current/location-catalogs')]);
	if (!response.ok) error(response.status, await companyMessage(response, 'companies.loadError'));
	return { section, catalogos: await response.json() as { especies_animales: { id_parametros: string; codigo: string; etiqueta: string }[] } };
};
export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const fid_parametros_especies = form.getAll('fid_parametros_especies').map(String);
		if (new Set(fid_parametros_especies).size !== fid_parametros_especies.length || !fid_parametros_especies.every((id) => UUID_V4.test(id))) return fail(400, { companyMessage: 'companies.invalidData' });
		return saveCompanySection(event, 'services', { fid_parametros_especies });
	}
};
