import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { companyMessage, companyRequest, formText, loadCompanySection, saveCompanySection } from '$lib/server/companies';
interface Fiscal { fid_parametros_tipo_persona_fiscal: string | null; fid_parametros_tipo_documento_fiscal: string | null; fiscal_numero_documento: string; fiscal_razon_social: string; fiscal_afecto_igv: boolean; fid_parametros_responsabilidad_fiscal: string | null; fiscal_telefono: string; fiscal_correo: string; fiscal_direccion: string; }
interface CatalogItem { id_parametros: string; codigo: string; etiqueta: string }
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const load: PageServerLoad = async (event) => { await event.parent(); const [section, response] = await Promise.all([loadCompanySection<Fiscal>(event, 'fiscal'), companyRequest(event, '/company/current/location-catalogs')]); if (!response.ok) error(response.status, await companyMessage(response, 'companies.loadError')); return { section, catalogos: await response.json() as { tipos_documento: CatalogItem[]; tipos_persona_fiscal: CatalogItem[]; responsabilidades_fiscales: CatalogItem[] } }; };
export const actions: Actions = { default: async (event) => {
	const form = await event.request.formData();
	const body = { fid_parametros_tipo_persona_fiscal: formText(form, 'fid_parametros_tipo_persona_fiscal') || null, fid_parametros_tipo_documento_fiscal: formText(form, 'fid_parametros_tipo_documento_fiscal') || null, fiscal_numero_documento: formText(form, 'fiscal_numero_documento'), fiscal_razon_social: formText(form, 'fiscal_razon_social'), fiscal_afecto_igv: form.get('fiscal_afecto_igv') === 'true', fid_parametros_responsabilidad_fiscal: formText(form, 'fid_parametros_responsabilidad_fiscal') || null, fiscal_telefono: formText(form, 'fiscal_telefono'), fiscal_correo: formText(form, 'fiscal_correo').toLowerCase(), fiscal_direccion: formText(form, 'fiscal_direccion') };
	if ([body.fid_parametros_tipo_persona_fiscal, body.fid_parametros_tipo_documento_fiscal, body.fid_parametros_responsabilidad_fiscal].some((id) => id !== null && !UUID_V4.test(id)) || body.fiscal_numero_documento.length > 30 || body.fiscal_razon_social.length > 150 || body.fiscal_telefono.length > 30 || body.fiscal_correo.length > 120 || body.fiscal_direccion.length > 250) return fail(400, { companyMessage: 'companies.invalidData' });
	return saveCompanySection(event, 'fiscal', body);
} };
