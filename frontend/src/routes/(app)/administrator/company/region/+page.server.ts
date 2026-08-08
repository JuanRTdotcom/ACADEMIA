import { error, fail } from '@sveltejs/kit';
// Catálogos regionales y empresa se resuelven por SSR.
import type { Actions, PageServerLoad } from './$types';
import {
	companyMessage,
	companyRequest,
	formText,
	loadCompanySection,
	saveCompanySection
} from '$lib/server/companies';

interface Region { idioma_por_defecto: string; zona_horaria_por_defecto: string; }
interface Catalogs { zonas_horarias: { id_zonas_horarias: string; nombre_iana: string; desfase_utc: string }[]; }

export const load: PageServerLoad = async (event) => {
	await event.parent();
	const [section, response] = await Promise.all([
		loadCompanySection<Region>(event, 'region'),
		companyRequest(event, '/system/catalogs/appearance')
	]);
	if (!response.ok) error(response.status, await companyMessage(response, 'companies.loadError'));
	return { section, catalogos: (await response.json()) as Catalogs };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const body = {
			idioma_por_defecto: formText(form, 'idioma_por_defecto'),
			zona_horaria_por_defecto: formText(form, 'zona_horaria_por_defecto')
		};
		if (!['es', 'en'].includes(body.idioma_por_defecto) || !/^[A-Za-z0-9_+\-/]{1,100}$/.test(body.zona_horaria_por_defecto)) return fail(400, { companyMessage: 'companies.invalidData' });
		return saveCompanySection(event, 'region', body);
	}
};
