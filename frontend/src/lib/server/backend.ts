import type { Cookies, RequestEvent } from "@sveltejs/kit";
import { serverConfig } from "./config";
import { sessionCookieName } from "./session";
import { COOKIE, normalizeLocale } from "$lib/i18n/index.svelte";

interface ResultadoRefrescoCompartido {
  ok: boolean;
  status: number;
  cookies: string[];
}

// Single-flight por refresh token. Dos cargas SSR o pestañas del mismo navegador
// que vencen a la vez comparten una llamada y reciben exactamente la misma rotación.
const refrescosEnCurso = new Map<
  string,
  Promise<ResultadoRefrescoCompartido>
>();

/** Lee una cookie sencilla desde la cabecera original sin ampliar el contrato del helper. */
function cookieValue(header: string | null, name: string): string | undefined {
  const prefix = `${name}=`;
  return header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

export function requestBackend(
  event: Pick<RequestEvent, "fetch" | "request" | "getClientAddress"> &
    Partial<Pick<RequestEvent, "cookies">>,
  path: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  // getAll() incluye cookies que un refresh acaba de rotar dentro de esta misma
  // petición SSR; la cabecera original todavía contendría los tokens anteriores.
  const cookie = event.cookies
    ?.getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ") ?? event.request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  // El idioma elegido es mutable y no debe quedar congelado en el JWT.
  headers.set("accept-language", normalizeLocale(cookieValue(cookie, COOKIE)));
  // Reenvía la IP real del cliente. Nest la lee vía X-Forwarded-For (trust proxy = 1);
  // sin esta cabecera, Express se queda sin candidato y req.ip queda undefined.
  // getClientAddress() ya resuelve la IP real cuando SvelteKit está tras un proxy de confianza.
  // En dev, tras un proxy que no expone la dirección del socket, lanza
  // "Could not determine clientAddress"; caemos a la IP local para no romper el SSR.
  let clientAddress: string;
  try {
    clientAddress = event.getClientAddress();
  } catch {
    clientAddress = "127.0.0.1";
  }
  const forwardedFor = event.request.headers.get("x-forwarded-for");
  headers.set(
    "x-forwarded-for",
    forwardedFor ? `${forwardedFor}, ${clientAddress}` : clientAddress,
  );
  // Reenvía el host original del navegador para que el backend identifique el
  // tenant por su subdominio (multi-tenant). SvelteKit actúa de proxy: sin esto,
  // el backend solo vería su propio host (localhost:3000).
  const host = event.request.headers.get("host");
  if (host) headers.set("x-forwarded-host", host);
  // Conserva navegador/SO reales; sin esto Nest solo ve el User-Agent de Node.
  const userAgent = event.request.headers.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent);
  // Cabecera anti-CSRF que exige el backend en métodos que mutan estado. Solo este
  // servidor (no el navegador cross-site) puede añadirla. El valor es indiferente.
  headers.set("x-sumaq-csrf", "1");
  return event.fetch(`${serverConfig.apiUrl}${path}`, { ...init, headers });
}

export function copyAuthCookies(
  headers: Headers,
  cookies: Cookies,
  secure: boolean,
): void {
  const responseHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };
  copyAuthCookieValues(
    responseHeaders.getSetCookie?.() ?? [],
    cookies,
    secure,
  );
}

export function copyAuthCookieValues(
  values: string[],
  cookies: Cookies,
  secure: boolean,
): void {
  for (const value of values) {
    const pair = value.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    const name = pair.slice(0, separator);
    const token = pair.slice(separator + 1);
    cookies.set(name, token, {
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge:
        name === sessionCookieName
          ? serverConfig.refreshTokenTtl
          : serverConfig.accessTokenTtl,
    });
  }
}

/** Coordina refresh concurrentes dentro de esta instancia de SvelteKit. */
export function refreshBackendSession(
  event: RequestEvent,
): Promise<ResultadoRefrescoCompartido> {
  const tokenRefresco = event.cookies.get(sessionCookieName);
  if (!tokenRefresco) {
    return Promise.resolve({ ok: false, status: 401, cookies: [] });
  }

  const existente = refrescosEnCurso.get(tokenRefresco);
  if (existente) return existente;

  const operacion = (async () => {
    const response = await requestBackend(event, "/auth/refresh", {
      method: "POST",
    });
    const responseHeaders = response.headers as Headers & {
      getSetCookie?: () => string[];
    };
    return {
      ok: response.ok,
      status: response.status,
      cookies: responseHeaders.getSetCookie?.() ?? [],
    };
  })().finally(() => {
    if (refrescosEnCurso.get(tokenRefresco) === operacion) {
      refrescosEnCurso.delete(tokenRefresco);
    }
  });

  refrescosEnCurso.set(tokenRefresco, operacion);
  return operacion;
}
