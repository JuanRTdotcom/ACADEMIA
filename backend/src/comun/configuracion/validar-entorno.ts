const VARIABLES_TEXTO = [
  "DATABASE_URL",
  "NODE_ENV",
  "FRONTEND_ORIGIN",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "REFRESH_TOKEN_HASH_SECRET",
  "JWT_ISSUER", // emisor esperado del token (claim iss)
  "JWT_AUDIENCE", // audiencia esperada del token (claim aud)
  "APP_BASE_DOMAIN", // dominio raíz del SaaS (ej. localhost en dev, sumaq.com en prod)
  "UPLOADS_DIRECTORY", // raíz persistente para archivos subidos
  "OWNER_ORG_SLUG", // slug de la organización propietaria/raíz del SaaS
  "STORAGE_PROVIDER", // proveedor de objetos; actualmente solo se admite R2
  "STORAGE_ACCOUNT_ID", // identificador de la cuenta Cloudflare
  "STORAGE_BUCKET", // bucket privado usado por el backend
  "STORAGE_ACCESS_KEY_ID", // credencial S3 de R2 (solo backend)
  "STORAGE_SECRET_ACCESS_KEY", // secreto S3 de R2 (solo backend)
  "STORAGE_ENDPOINT", // endpoint S3 completo de la cuenta R2
  "STORAGE_REGION", // R2 usa la región lógica "auto"
] as const;

const VARIABLES_ENTERAS = [
  "PORT",
  "JWT_ACCESS_TTL_MINUTES",
  "JWT_REFRESH_TTL_HOURS",
  "SESSION_IDLE_TTL_MINUTES",
  "SESSION_ABSOLUTE_TTL_DAYS",
  "REFRESH_REUSE_GRACE_SECONDS",
  "REFRESH_SESSION_RATE_LIMIT",
  "REFRESH_SESSION_RATE_WINDOW_SECONDS",
  "LOGIN_MAX_INTENTOS", // intentos de contraseña fallidos antes de bloquear la cuenta
  "LOGIN_BLOQUEO_MINUTOS", // minutos que dura el bloqueo tras alcanzar el límite
  "AVATAR_MAX_BYTES", // máximo aceptado antes de procesar el avatar
  "AVATAR_CACHE_TTL_SECONDS", // caché privada de cada versión inmutable del avatar
  "COMPANY_MEDIA_MAX_BYTES", // máximo del original antes de procesar identidad/portadas
  "PROFILE_MAX_EMAILS", // tope de correos activos por persona
  "PROFILE_MAX_NATIONALITIES", // tope de nacionalidades activas por persona
  "PROFILE_MAX_INSURANCES", // tope de seguros activos por persona
  "PROFILE_MAX_DOCUMENTS", // tope de documentos activos por persona
  "PROFILE_MAX_HOBBIES", // tope de hobbies activos por persona
  "PROFILE_MAX_ACADEMIC_STUDIES", // tope de estudios realizados activos por persona
  "PROFILE_MAX_COMPLEMENTARY_STUDIES", // tope de estudios complementarios activos por persona
  "STORAGE_SIGNED_URL_TTL_SECONDS", // vigencia de una URL temporal de carga/descarga
] as const;

/** Exige texto no vacío; nunca sustituye una variable faltante. */
function exigirTexto(
  configuracion: Record<string, unknown>,
  nombre: (typeof VARIABLES_TEXTO)[number],
): string {
  const valor = configuracion[nombre];
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
  }
  return valor.trim();
}

/** Exige un entero positivo; nunca usa un valor predeterminado. */
function exigirEntero(
  configuracion: Record<string, unknown>,
  nombre: (typeof VARIABLES_ENTERAS)[number],
): number {
  const valorCrudo = configuracion[nombre];
  if (valorCrudo === undefined || valorCrudo === null || valorCrudo === "") {
    throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
  }

  const valor = Number(valorCrudo);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new Error(
      `La variable de entorno ${nombre} debe ser un número entero mayor que cero`,
    );
  }
  return valor;
}

/** Valida toda la configuración necesaria antes de iniciar NestJS. */
export function validarEntorno(
  configuracion: Record<string, unknown>,
): Record<string, unknown> {
  for (const nombre of VARIABLES_TEXTO) exigirTexto(configuracion, nombre);
  for (const nombre of VARIABLES_ENTERAS) exigirEntero(configuracion, nombre);

  const nodeEnv = exigirTexto(configuracion, "NODE_ENV");
  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new Error(
      "La variable NODE_ENV debe ser development, test o production",
    );
  }

  const puerto = exigirEntero(configuracion, "PORT");
  if (puerto > 65_535) {
    throw new Error("La variable PORT debe estar entre 1 y 65535");
  }

  const databaseUrl = exigirTexto(configuracion, "DATABASE_URL");
  let urlBase: URL;
  try {
    urlBase = new URL(databaseUrl);
  } catch {
    throw new Error("La variable DATABASE_URL debe contener una URL válida");
  }
  if (!["postgresql:", "postgres:"].includes(urlBase.protocol)) {
    throw new Error("DATABASE_URL debe apuntar a PostgreSQL");
  }

  const frontendOrigin = exigirTexto(configuracion, "FRONTEND_ORIGIN");
  let urlFrontend: URL;
  try {
    urlFrontend = new URL(frontendOrigin);
  } catch {
    throw new Error("La variable FRONTEND_ORIGIN debe contener una URL válida");
  }
  if (urlFrontend.origin !== frontendOrigin) {
    throw new Error(
      "FRONTEND_ORIGIN debe contener solo el origen, sin ruta ni barra final",
    );
  }

  const secretoAcceso = exigirTexto(configuracion, "JWT_ACCESS_SECRET");
  const secretoRefresco = exigirTexto(configuracion, "JWT_REFRESH_SECRET");
  const secretoHashRefresco = exigirTexto(
    configuracion,
    "REFRESH_TOKEN_HASH_SECRET",
  );
  if (
    secretoAcceso.length < 32 ||
    secretoRefresco.length < 32 ||
    secretoHashRefresco.length < 32
  ) {
    throw new Error(
      "Los secretos de autenticación deben contener al menos 32 caracteres",
    );
  }
  if (
    new Set([secretoAcceso, secretoRefresco, secretoHashRefresco]).size !== 3
  ) {
    throw new Error(
      "JWT_ACCESS_SECRET, JWT_REFRESH_SECRET y REFRESH_TOKEN_HASH_SECRET deben ser distintos",
    );
  }

  const maximoAvatarBytes = exigirEntero(configuracion, "AVATAR_MAX_BYTES");
  if (maximoAvatarBytes !== 2 * 1024 * 1024) {
    throw new Error(
      "La variable AVATAR_MAX_BYTES debe ser exactamente 2097152 (2 MB)",
    );
  }
  const ttlCacheAvatar = exigirEntero(
    configuracion,
    "AVATAR_CACHE_TTL_SECONDS",
  );
  if (ttlCacheAvatar > 31_536_000) {
    throw new Error(
      "AVATAR_CACHE_TTL_SECONDS no puede superar 31536000 segundos",
    );
  }
  const maximoMedioEmpresaBytes = exigirEntero(
    configuracion,
    "COMPANY_MEDIA_MAX_BYTES",
  );
  if (maximoMedioEmpresaBytes !== 3 * 1024 * 1024) {
    throw new Error(
      "La variable COMPANY_MEDIA_MAX_BYTES debe ser exactamente 3145728 (3 MB)",
    );
  }

  const proveedorAlmacenamiento = exigirTexto(
    configuracion,
    "STORAGE_PROVIDER",
  ).toLowerCase();
  if (proveedorAlmacenamiento !== "r2") {
    throw new Error("La variable STORAGE_PROVIDER debe ser r2");
  }

  const accountId = exigirTexto(configuracion, "STORAGE_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new Error(
      "La variable STORAGE_ACCOUNT_ID debe ser un ID de cuenta Cloudflare válido",
    );
  }

  const bucket = exigirTexto(configuracion, "STORAGE_BUCKET");
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new Error(
      "La variable STORAGE_BUCKET debe contener entre 3 y 63 caracteres en minúsculas, números o guiones",
    );
  }

  const regionAlmacenamiento = exigirTexto(
    configuracion,
    "STORAGE_REGION",
  ).toLowerCase();
  if (regionAlmacenamiento !== "auto") {
    throw new Error(
      "La variable STORAGE_REGION debe ser auto para Cloudflare R2",
    );
  }

  const endpointTexto = exigirTexto(configuracion, "STORAGE_ENDPOINT");
  let endpointAlmacenamiento: URL;
  try {
    endpointAlmacenamiento = new URL(endpointTexto);
  } catch {
    throw new Error(
      "La variable STORAGE_ENDPOINT debe contener una URL válida",
    );
  }
  const hostEsperado = `${accountId.toLowerCase()}.r2.cloudflarestorage.com`;
  if (
    endpointAlmacenamiento.protocol !== "https:" ||
    endpointAlmacenamiento.hostname.toLowerCase() !== hostEsperado ||
    endpointAlmacenamiento.pathname !== "/" ||
    endpointAlmacenamiento.search ||
    endpointAlmacenamiento.hash
  ) {
    throw new Error(
      `STORAGE_ENDPOINT debe ser exactamente https://${hostEsperado}`,
    );
  }

  const accessKeyId = exigirTexto(configuracion, "STORAGE_ACCESS_KEY_ID");
  const secretAccessKey = exigirTexto(
    configuracion,
    "STORAGE_SECRET_ACCESS_KEY",
  );
  if (accessKeyId.length < 16 || secretAccessKey.length < 32) {
    throw new Error(
      "Las credenciales STORAGE_ACCESS_KEY_ID y STORAGE_SECRET_ACCESS_KEY no tienen una longitud válida",
    );
  }

  const ttlUrlFirmada = exigirEntero(
    configuracion,
    "STORAGE_SIGNED_URL_TTL_SECONDS",
  );
  if (ttlUrlFirmada > 3600) {
    throw new Error(
      "STORAGE_SIGNED_URL_TTL_SECONDS no puede superar 3600 segundos",
    );
  }

  return {
    ...configuracion,
    DATABASE_URL: databaseUrl,
    NODE_ENV: nodeEnv,
    FRONTEND_ORIGIN: frontendOrigin,
    PORT: puerto,
    JWT_ACCESS_SECRET: secretoAcceso,
    JWT_REFRESH_SECRET: secretoRefresco,
    REFRESH_TOKEN_HASH_SECRET: secretoHashRefresco,
    JWT_ISSUER: exigirTexto(configuracion, "JWT_ISSUER"),
    JWT_AUDIENCE: exigirTexto(configuracion, "JWT_AUDIENCE"),
    APP_BASE_DOMAIN: exigirTexto(configuracion, "APP_BASE_DOMAIN")
      .toLowerCase()
      .replace(/:\d+$/, ""), // normaliza: minúsculas y sin puerto
    UPLOADS_DIRECTORY: exigirTexto(configuracion, "UPLOADS_DIRECTORY"),
    OWNER_ORG_SLUG: exigirTexto(configuracion, "OWNER_ORG_SLUG").toLowerCase(),
    AVATAR_MAX_BYTES: maximoAvatarBytes,
    AVATAR_CACHE_TTL_SECONDS: ttlCacheAvatar,
    COMPANY_MEDIA_MAX_BYTES: maximoMedioEmpresaBytes,
    STORAGE_PROVIDER: proveedorAlmacenamiento,
    STORAGE_ACCOUNT_ID: accountId.toLowerCase(),
    STORAGE_BUCKET: bucket,
    STORAGE_ACCESS_KEY_ID: accessKeyId,
    STORAGE_SECRET_ACCESS_KEY: secretAccessKey,
    STORAGE_ENDPOINT: endpointAlmacenamiento.origin,
    STORAGE_REGION: regionAlmacenamiento,
    STORAGE_SIGNED_URL_TTL_SECONDS: ttlUrlFirmada,

    JWT_ACCESS_TTL_MINUTES: exigirEntero(
      configuracion,
      "JWT_ACCESS_TTL_MINUTES",
    ),
    JWT_REFRESH_TTL_HOURS: exigirEntero(configuracion, "JWT_REFRESH_TTL_HOURS"),
    SESSION_IDLE_TTL_MINUTES: exigirEntero(
      configuracion,
      "SESSION_IDLE_TTL_MINUTES",
    ),
    SESSION_ABSOLUTE_TTL_DAYS: exigirEntero(
      configuracion,
      "SESSION_ABSOLUTE_TTL_DAYS",
    ),
    REFRESH_REUSE_GRACE_SECONDS: exigirEntero(
      configuracion,
      "REFRESH_REUSE_GRACE_SECONDS",
    ),
    REFRESH_SESSION_RATE_LIMIT: exigirEntero(
      configuracion,
      "REFRESH_SESSION_RATE_LIMIT",
    ),
    REFRESH_SESSION_RATE_WINDOW_SECONDS: exigirEntero(
      configuracion,
      "REFRESH_SESSION_RATE_WINDOW_SECONDS",
    ),
    LOGIN_MAX_INTENTOS: exigirEntero(configuracion, "LOGIN_MAX_INTENTOS"),
    LOGIN_BLOQUEO_MINUTOS: exigirEntero(configuracion, "LOGIN_BLOQUEO_MINUTOS"),
    PROFILE_MAX_EMAILS: exigirEntero(configuracion, "PROFILE_MAX_EMAILS"),
    PROFILE_MAX_NATIONALITIES: exigirEntero(
      configuracion,
      "PROFILE_MAX_NATIONALITIES",
    ),
    PROFILE_MAX_INSURANCES: exigirEntero(
      configuracion,
      "PROFILE_MAX_INSURANCES",
    ),
    PROFILE_MAX_DOCUMENTS: exigirEntero(configuracion, "PROFILE_MAX_DOCUMENTS"),
    PROFILE_MAX_HOBBIES: exigirEntero(configuracion, "PROFILE_MAX_HOBBIES"),
    PROFILE_MAX_ACADEMIC_STUDIES: exigirEntero(
      configuracion,
      "PROFILE_MAX_ACADEMIC_STUDIES",
    ),
    PROFILE_MAX_COMPLEMENTARY_STUDIES: exigirEntero(
      configuracion,
      "PROFILE_MAX_COMPLEMENTARY_STUDIES",
    ),
  };
}
