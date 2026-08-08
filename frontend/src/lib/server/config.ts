import { env } from "$env/dynamic/private";

/** Exige texto no vacío; el frontend SSR no usa valores predeterminados. */
function required(name: string, value: string | undefined): string {
  if (!value?.trim())
    throw new Error(`Missing required environment variable ${name}.`);
  return value.trim();
}

/** Exige un entero positivo para duraciones expresadas en segundos. */
function requiredPositiveInteger(
  name: string,
  value: string | undefined,
): number {
  const raw = required(name, value);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer.`);
  }
  return parsed;
}

/** Exige una URL absoluta sin barra final para evitar uniones ambiguas. */
function requiredUrl(name: string, value: string | undefined): string {
  const raw = required(name, value);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `Environment variable ${name} must be a valid absolute URL.`,
    );
  }
  if (!["http:", "https:"].includes(parsed.protocol) || raw.endsWith("/")) {
    throw new Error(
      `Environment variable ${name} must use HTTP(S) and have no trailing slash.`,
    );
  }
  return raw;
}

/** URL absoluta opcional; null si no se define. Valida el formato solo si viene. */
function optionalUrl(name: string, value: string | undefined): string | null {
  if (!value?.trim()) return null;
  return requiredUrl(name, value);
}

const refreshCookieName = required(
  "REFRESH_COOKIE_NAME",
  env.REFRESH_COOKIE_NAME,
);
if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(refreshCookieName)) {
  throw new Error(
    "Environment variable REFRESH_COOKIE_NAME is not a valid cookie name.",
  );
}

const avatarMaxBytes = requiredPositiveInteger(
  "AVATAR_MAX_BYTES",
  env.AVATAR_MAX_BYTES,
);
if (avatarMaxBytes !== 2 * 1024 * 1024) {
  throw new Error(
    "Environment variable AVATAR_MAX_BYTES must be exactly 2097152 (2 MB).",
  );
}

export const serverConfig = Object.freeze({
  apiUrl: requiredUrl("API_URL", env.API_URL),
  appUrl: requiredUrl("APP_URL", env.APP_URL),
  accessTokenTtl: requiredPositiveInteger(
    "ACCESS_TOKEN_TTL",
    env.ACCESS_TOKEN_TTL,
  ),
  refreshTokenTtl: requiredPositiveInteger(
    "REFRESH_TOKEN_TTL",
    env.REFRESH_TOKEN_TTL,
  ),
  refreshCookieName,
  avatarMaxBytes,
  // A dónde mandar un subdominio no registrado. Si es null, se muestra la página 404
  // interna; más adelante se puede apuntar a una landing pública.
  tenantNotFoundUrl: optionalUrl(
    "TENANT_NOT_FOUND_URL",
    env.TENANT_NOT_FOUND_URL,
  ),
});
