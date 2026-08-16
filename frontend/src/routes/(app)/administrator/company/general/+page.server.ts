import type { PageServerLoad } from './$types';
import { loadCompanySection } from '$lib/server/companies';

// La organización se resuelve desde la sesión; la URL nunca recibe un tenant.

interface General {
	nombre: string;
	slug: string;
	razon_social: string;
	ruc_nif: string;
	plan_nombre: string;
}
export const load: PageServerLoad = async (event) => {
	const parentData = await event.parent();
	return {
		section: await loadCompanySection<General>(event, 'general'),
		sede: parentData.empresa.sede_activa
	};
};
