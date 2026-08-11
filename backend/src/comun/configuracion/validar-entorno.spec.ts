import { validarEntorno } from "./validar-entorno";

function configuracionValida(): Record<string, unknown> {
  const secreto = (letra: string) => letra.repeat(48);
  return {
    DATABASE_URL: "postgresql://user:pass@localhost:5432/sumaq",
    NODE_ENV: "test",
    PORT: "3000",
    FRONTEND_ORIGIN: "http://localhost:5173",
    JWT_ACCESS_SECRET: secreto("a"),
    JWT_REFRESH_SECRET: secreto("b"),
    REFRESH_TOKEN_HASH_SECRET: secreto("c"),
    JWT_ISSUER: "sumaq-api",
    JWT_AUDIENCE: "sumaq-web",
    APP_BASE_DOMAIN: "localhost",
    UPLOADS_DIRECTORY: "uploads",
    OWNER_ORG_SLUG: "admin",
    JWT_ACCESS_TTL_MINUTES: "15",
    JWT_REFRESH_TTL_HOURS: "12",
    SESSION_IDLE_TTL_MINUTES: "120",
    SESSION_ABSOLUTE_TTL_DAYS: "30",
    REFRESH_REUSE_GRACE_SECONDS: "10",
    REFRESH_SESSION_RATE_LIMIT: "20",
    REFRESH_SESSION_RATE_WINDOW_SECONDS: "60",
    LOGIN_MAX_INTENTOS: "5",
    LOGIN_BLOQUEO_MINUTOS: "15",
    AVATAR_MAX_BYTES: String(3 * 1024 * 1024),
    ATTENTION_ATTACHMENT_MAX_BYTES: String(10 * 1024 * 1024),
    ATTENTION_ATTACHMENT_MAX_FILES: "10",
    ATTENTION_ATTACHMENT_CACHE_TTL_SECONDS: "86400",
    AVATAR_CACHE_TTL_SECONDS: "31536000",
    COMPANY_MEDIA_MAX_BYTES: String(3 * 1024 * 1024),
    PROFILE_MAX_EMAILS: "10",
    PROFILE_MAX_NATIONALITIES: "10",
    PROFILE_MAX_INSURANCES: "10",
    PROFILE_MAX_DOCUMENTS: "10",
    PROFILE_MAX_HOBBIES: "20",
    PROFILE_MAX_ACADEMIC_STUDIES: "30",
    PROFILE_MAX_COMPLEMENTARY_STUDIES: "30",
    STORAGE_PROVIDER: "r2",
    STORAGE_ACCOUNT_ID: "d".repeat(32),
    STORAGE_BUCKET: "sumaq-development-private",
    STORAGE_ACCESS_KEY_ID: "e".repeat(32),
    STORAGE_SECRET_ACCESS_KEY: secreto("f"),
    STORAGE_ENDPOINT: `https://${"d".repeat(32)}.r2.cloudflarestorage.com`,
    STORAGE_REGION: "auto",
    STORAGE_SIGNED_URL_TTL_SECONDS: "900",
  };
}

describe("validarEntorno - almacenamiento", () => {
  it("detiene el arranque si falta una credencial obligatoria", () => {
    const configuracion = configuracionValida();
    delete configuracion.STORAGE_SECRET_ACCESS_KEY;

    expect(() => validarEntorno(configuracion)).toThrow(
      "Falta la variable de entorno obligatoria: STORAGE_SECRET_ACCESS_KEY",
    );
  });

  it("rechaza un endpoint que no pertenece a la cuenta configurada", () => {
    const configuracion = configuracionValida();
    configuracion.STORAGE_ENDPOINT =
      "https://otra-cuenta.r2.cloudflarestorage.com";

    expect(() => validarEntorno(configuracion)).toThrow(
      "STORAGE_ENDPOINT debe ser exactamente",
    );
  });

  it("acepta y tipa una configuración R2 consistente", () => {
    const resultado = validarEntorno(configuracionValida());

    expect(resultado.STORAGE_PROVIDER).toBe("r2");
    expect(resultado.STORAGE_SIGNED_URL_TTL_SECONDS).toBe(900);
  });
});
