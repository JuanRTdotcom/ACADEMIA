import { error, fail, redirect, type Actions, type RequestEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { UUID, companyMessage, companyRequest, formText } from '$lib/server/companies';
import { tienePermiso } from '$lib/permissions-client';

async function mutation(event: RequestEvent, route: string, method: string, payload?: object) {
  try {
    const response = await companyRequest(event, route, { method, ...(payload ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) } : {}) });
    if (!response.ok) return fail(response.status, { userMessage: await companyMessage(response, method === 'DELETE' ? 'users.deleteError' : 'users.saveError') });
    return { userMessage: 'ok' };
  } catch { return fail(503, { userMessage: 'users.serviceUnavailable' }); }
}

export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  if (!tienePermiso(usuario.permisos, 'superadmin.users.read', 'superadmin.users.create', 'superadmin.users.update', 'superadmin.users.delete', 'systemUsers.read', 'systemUsers.manage')) {
    redirect(303, '/dashboard');
  }
  const q = event.url.searchParams.get('q')?.trim() ?? '';
  try {
    const response = await companyRequest(event, `/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    if (!response.ok) error(response.status, await companyMessage(response, 'users.loadError'));
    return { ...(await response.json()), q };
  } catch (cause) {
    if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
    error(503, 'users.serviceUnavailable');
  }
};

export const actions: Actions = {
  status: async (event) => {
    const form = await event.request.formData(); const id = formText(form, 'id'); const raw = form.get('activo');
    if (!UUID.test(id) || (raw !== 'true' && raw !== 'false')) return fail(400, { userMessage: 'users.invalidData' });
    return mutation(event, `/users/${id}/status`, 'PATCH', { activo: raw === 'true' });
  },
  delete: async (event) => {
    const id = formText(await event.request.formData(), 'id');
    if (!UUID.test(id)) return fail(400, { userMessage: 'users.invalidData' });
    return mutation(event, `/users/${id}`, 'DELETE');
  },
  resetPassword: async (event) => {
    const form = await event.request.formData();
    const id = formText(form, 'id');
    const contrasenia_nueva = formText(form, 'contrasenia_nueva');
    if (!UUID.test(id) || !contrasenia_nueva) return fail(400, { userMessage: 'users.invalidData' });
    return mutation(event, `/users/${id}/reset-password`, 'PATCH', { contrasenia_nueva });
  }
};
