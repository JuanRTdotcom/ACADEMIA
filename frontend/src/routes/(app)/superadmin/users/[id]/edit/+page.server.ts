import { error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { UUID, companyMessage, companyRequest, formText } from '$lib/server/companies';

const NAME = /^[\p{L}][\p{L}\s'\-]*$/u;
const USERNAME = /^[A-Z0-9]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function body(form: FormData) {
  return {
    fid_organizaciones: formText(form, 'fid_organizaciones'),
    usuario: formText(form, 'usuario').toUpperCase(),
    nombres: formText(form, 'nombres'),
    apellido_paterno: formText(form, 'apellido_paterno'),
    apellido_materno: formText(form, 'apellido_materno'),
    correo: formText(form, 'correo').toLowerCase(),
    fid_roles: form.getAll('fid_roles').map(String),
    fid_permisos: form.getAll('fid_permisos').map(String)
  };
}

function validationError(data: ReturnType<typeof body>): string | null {
  if (!UUID.test(data.fid_organizaciones)) return 'users.validation.required';
  if (!USERNAME.test(data.usuario) || data.usuario.length < 3 || data.usuario.length > 12) return 'users.validation.username';
  if (![data.nombres, data.apellido_paterno, data.apellido_materno].every((value, index) => value.length >= 2 && value.length <= (index === 0 ? 50 : 30) && NAME.test(value))) return 'users.validation.name';
  if (data.correo.length > 254 || !EMAIL.test(data.correo)) return 'users.validation.email';
  if (data.fid_roles.length === 0 || data.fid_roles.length > 20 || new Set(data.fid_roles).size !== data.fid_roles.length || !data.fid_roles.every((id) => UUID.test(id))) return 'users.validation.roles';
  if (data.fid_permisos.length > 500 || new Set(data.fid_permisos).size !== data.fid_permisos.length || !data.fid_permisos.every((id) => UUID.test(id))) return 'users.validation.permissions';
  return null;
}

export const load: PageServerLoad = async (event) => {
  await event.parent();
  if (!UUID.test(event.params.id)) error(404, 'users.notFound');
  try {
    const [userResponse, optionsResponse] = await Promise.all([
      companyRequest(event, `/users/${event.params.id}`),
      companyRequest(event, '/users/creation-options')
    ]);
    if (!userResponse.ok) error(userResponse.status, await companyMessage(userResponse, 'users.loadError'));
    if (!optionsResponse.ok) error(optionsResponse.status, await companyMessage(optionsResponse, 'users.loadError'));
    return { usuarioEditado: await userResponse.json(), opciones: await optionsResponse.json() };
  } catch (cause) {
    if (cause && typeof cause === 'object' && 'status' in cause) throw cause;
    error(503, 'users.serviceUnavailable');
  }
};

export const actions: Actions = {
  save: async (event) => {
    const id = event.params.id ?? '';
    if (!UUID.test(id)) return fail(404, { userMessage: 'users.notFound' });
    const payload = body(await event.request.formData());
    const userMessage = validationError(payload);
    if (userMessage) return fail(400, { userMessage });
    try {
      const response = await companyRequest(event, `/users/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) return fail(response.status, { userMessage: await companyMessage(response, 'users.saveError') });
      return { userMessage: 'users.updated' };
    } catch {
      return fail(503, { userMessage: 'users.serviceUnavailable' });
    }
  }
};
