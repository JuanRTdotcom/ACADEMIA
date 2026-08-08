import * as v from "valibot";

// Solo clases de caracteres; la LONGITUD la imponen minLength/maxLength (no el regex).
const PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/;

/**
 * Login form schema. Single source of truth for both server and client validation
 * (via superforms). Field keys stay in Spanish because they are the backend contract;
 * the error messages are i18n keys resolved in the UI.
 */
export const loginSchema = v.object({
  usuario: v.pipe(
    v.string(),
    v.trim(),
    v.toUpperCase(),
    v.nonEmpty("login.requiredCredentials"),
    v.maxLength(12, "login.invalidUsername"),
    v.regex(/^[A-Za-z0-9]+$/, "login.invalidUsername"),
  ),
  contrasenia: v.pipe(
    v.string(),
    v.nonEmpty("login.passwordRequired"),
    v.minLength(8, "login.passwordPolicy"),
    v.maxLength(20, "login.passwordPolicy"),
    v.regex(PASSWORD_POLICY, "login.passwordPolicy"),
  ),
});

export type LoginSchema = typeof loginSchema;
