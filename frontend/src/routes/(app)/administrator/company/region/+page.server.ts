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

interface Region { fid_parametros_idioma: string; fid_zonas_horarias: string; fid_parametros_moneda: string; }
interface CatalogItem { id_parametros: string; codigo: string; etiqueta: string }
interface Catalogs { zonas_horarias: { id_zonas_horarias: string; nombre_iana: string }[]; idiomas: CatalogItem[]; monedas: CatalogItem[]; }
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async (event) => {
	await event.parent();
	const [section, response] = await Promise.all([
		loadCompanySection<Region>(event, 'region'),
		companyRequest(event, '/company/current/location-catalogs')
	]);
	if (!response.ok) error(response.status, await companyMessage(response, 'companies.loadError'));
	return { section, catalogos: (await response.json()) as Catalogs };
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const body = {
			fid_parametros_idioma: formText(form, 'fid_parametros_idioma'),
			fid_zonas_horarias: formText(form, 'fid_zonas_horarias'),
			fid_parametros_moneda: formText(form, 'fid_parametros_moneda')
	};
	if (!Object.values(body).every((value) => UUID_V4.test(value))) return fail(400, { companyMessage: 'companies.invalidData' });
		return saveCompanySection(event, 'region', body);
	}
};
