import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { copyAuthCookieValues, refreshBackendSession, requestBackend } from '$lib/server/backend';

const VERSION_AVATAR = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.jpg$/i;

async function requestWithRefresh(event: Parameters<RequestHandler>[0]) {
  const call = () => requestBackend(event, `/users/${event.params.id}/avatar/${event.params.version}`);
  let response = await call();
  if (response.status !== 401) return response;
  const refresh = await refreshBackendSession(event);
  if (!refresh.ok) return response;
  copyAuthCookieValues(refresh.cookies, event.cookies, event.url.protocol === 'https:');
  return call();
}

export const GET: RequestHandler = async (event) => {
  if (!VERSION_AVATAR.test(event.params.version)) error(404, 'profile.avatar.notFound');
  try {
    const response = await requestWithRefresh(event);
    const headers = new Headers();
    for (const name of ['content-type', 'cache-control', 'etag', 'x-content-type-options', 'content-disposition', 'cross-origin-resource-policy', 'content-security-policy', 'vary']) {
      const value = response.headers.get(name); if (value) headers.set(name, value);
    }
    if (!response.ok) headers.set('cache-control', 'private, no-store');
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return json({ message: 'profile.avatar.loadError' }, { status: 503, headers: { 'cache-control': 'private, no-store' } });
  }
};
