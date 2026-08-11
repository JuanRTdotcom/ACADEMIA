import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { formText, loadCompanySection, saveCompanySection } from '$lib/server/companies';
interface Schedule { dia_semana: number; turno: number; cerrado: boolean; hora_apertura: string | null; hora_cierre: string | null; }
interface Agenda { agenda_activa: boolean; duracion_cita_estimada: number; horarios: Schedule[]; }
const TIME = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;
export const load: PageServerLoad = async (event) => { await event.parent(); return { section: await loadCompanySection<Agenda>(event, 'agenda') }; };
export const actions: Actions = { default: async (event) => {
	const form = await event.request.formData(); let horarios: Schedule[];
	try { horarios = JSON.parse(formText(form, 'horarios')); } catch { return fail(400, { companyMessage: 'companies.invalidSchedule' }); }
	const body = { agenda_activa: form.get('agenda_activa') === 'true', duracion_cita_estimada: Number(formText(form, 'duracion_cita_estimada')), horarios };
	const keys = new Set(horarios.map((h) => `${h.dia_semana}:${h.turno}`));
	if (!Number.isInteger(body.duracion_cita_estimada) || body.duracion_cita_estimada < 5 || body.duracion_cita_estimada > 480 || horarios.length > 21 || keys.size !== horarios.length || horarios.some((h) => !Number.isInteger(h.dia_semana) || h.dia_semana < 1 || h.dia_semana > 7 || !Number.isInteger(h.turno) || h.turno < 1 || h.turno > 3 || (!h.cerrado && (!h.hora_apertura || !h.hora_cierre || !TIME.test(h.hora_apertura) || !TIME.test(h.hora_cierre) || h.hora_apertura >= h.hora_cierre)))) return fail(400, { companyMessage: 'companies.invalidSchedule' });
	return saveCompanySection(event, 'agenda', body);
} };
