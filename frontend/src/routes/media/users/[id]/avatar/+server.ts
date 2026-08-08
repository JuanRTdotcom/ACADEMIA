import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { copyAuthCookieValues, refreshBackendSession, requestBackend } from '$lib/server/backend';

async function requestWithRefresh(event: Parameters<RequestHandler>[0]) {
  const call = () => requestBackend(event, `/users/${event.params.id}/avatar`);
  let response = await call();
  if (response.status !== 401) return response;
  const refresh = await refreshBackendSession(event);
  if (!refresh.ok) return response;
  copyAuthCookieValues(refresh.cookies, event.cookies, event.url.protocol === 'https:');
  return call();
}

export const GET: RequestHandler = async (event) => {
  try {
    const response = await requestWithRefresh(event);
    const version = event.url.searchParams.get('v');
    const matchesVersion = Boolean(version) && response.headers.get('etag') === `"${version}"`;
    const headers = new Headers({
      'cache-control': response.ok && matchesVersion ? (response.headers.get('cache-control') ?? 'private, no-store') : 'private, no-store'
    });
    for (const name of ['content-type', 'etag', 'x-content-type-options', 'content-disposition', 'cross-origin-resource-policy', 'content-security-policy', 'vary']) {
      const value = response.headers.get(name); if (value) headers.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return json({ message: 'profile.avatar.loadError' }, { status: 503, headers: { 'cache-control': 'private, no-store' } });
  }
};
