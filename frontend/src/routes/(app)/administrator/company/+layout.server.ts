import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { companyMessage, companyRequest } from '$lib/server/companies';

interface CompanySummary {
	id_organizaciones: string;
	nombre: string;
	slug: string;
	estado: number;
	escudo_version: string | null;
	escudo_oscuro_version: string | null;
	url_publica: string;
	sede_activa: {
		nombre: string;
	} | null;
}

export const load: LayoutServerLoad = async (event) => {
	await event.parent();
	try {
		const response = await companyRequest(event, '/company/current/summary');
		if (!response.ok) error(response.status, await companyMessage(response, 'companies.notFound'));
		return {
			empresa: (await response.json()) as CompanySummary,
			protegida: false
		};
	} catch (cause) {
		if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
		error(503, 'companies.serviceUnavailable');
	}
};
