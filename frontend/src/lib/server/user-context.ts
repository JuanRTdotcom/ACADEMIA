import type { Cookies } from "@sveltejs/kit";
import { COOKIE } from "$lib/i18n/index.svelte";
import {
  isLocale,
  isTheme,
  PREFERENCE_COOKIE_MAX_AGE,
  THEME_COOKIE,
  THEME_MODE_COOKIE,
  type UserPreferences,
} from "$lib/preferences";
import {
  esResumenAccionesRequeridas,
  type ResumenAccionesRequeridas,
} from "$lib/required-actions";

export interface UserContext {
  id_usuarios: string;
  fid_organizaciones: string;
  usuario: string;
  correos: {
    id_personas_correos: string;
    correo: string;
    usos: ("principal" | "mensajes" | "respaldo")[];
    verificado: boolean;
  }[];
  persona: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string | null;
  };
  avatar: { disponible: boolean; version: string | null };
  organizacion: { slug: string; nombre: string };
  roles: { codigo: string; nombre: string }[];
  permisos: string[];
  modulos: { codigo: string; nombre: string; icono: string | null; ruta: string | null }[];
  preferencias: UserPreferences;
  seguridad: { segundo_factor_habilitado: boolean };
  acciones_requeridas: ResumenAccionesRequeridas;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

/** Rechaza respuestas incompletas: el SSR nunca autoriza con datos inventados. */
export function parseUserContext(value: unknown): UserContext {
  const data = asRecord(value);
  const person = asRecord(data?.persona);
  const organization = asRecord(data?.organizacion);
  const avatar = asRecord(data?.avatar);
  const preferences = asRecord(data?.preferencias);
  const security = asRecord(data?.seguridad);
  const requiredActions = data?.acciones_requeridas;
  const roles = data?.roles;
  const permissions = data?.permisos;
  const modules = data?.modulos;
  const valid =
    data !== null &&
    typeof data.id_usuarios === "string" &&
    typeof data.fid_organizaciones === "string" &&
    typeof data.usuario === "string" &&
    /^[A-Za-z0-9]{1,20}$/.test(data.usuario) &&
    Array.isArray(data.correos) &&
    data.correos.every((value: unknown) => {
      const correo = asRecord(value);
      return (
        typeof correo?.id_personas_correos === "string" &&
        typeof correo.correo === "string" &&
        Array.isArray(correo.usos) &&
        correo.usos.every(
          (uso) =>
            uso === "principal" || uso === "mensajes" || uso === "respaldo",
        ) &&
        typeof correo.verificado === "boolean"
      );
    }) &&
    typeof person?.nombres === "string" &&
    person.nombres.length <= 50 &&
    typeof person.apellido_paterno === "string" &&
    person.apellido_paterno.length <= 30 &&
    (person.apellido_materno === null ||
      (typeof person.apellido_materno === "string" &&
        person.apellido_materno.length <= 30)) &&
    typeof avatar?.disponible === "boolean" &&
    (avatar.version === null || typeof avatar.version === "string") &&
    typeof organization?.slug === "string" &&
    typeof organization.nombre === "string" &&
    Array.isArray(roles) &&
    roles.every((role: unknown) => {
      const item = asRecord(role);
      return (
        typeof item?.codigo === "string" && typeof item.nombre === "string"
      );
    }) &&
    Array.isArray(permissions) &&
    permissions.every(
      (permission: unknown) => typeof permission === "string",
    ) &&
    Array.isArray(modules) &&
    modules.every((module: unknown) => {
      const item = asRecord(module);
      return typeof item?.codigo === "string" && typeof item.nombre === "string" &&
        (item.icono === null || typeof item.icono === "string") &&
        (item.ruta === null || typeof item.ruta === "string");
    }) &&
    (preferences?.tema === null || isTheme(preferences?.tema)) &&
    (preferences?.idioma === null || isLocale(preferences?.idioma)) &&
    typeof preferences?.menu_colapsado === "boolean" &&
    typeof security?.segundo_factor_habilitado === "boolean" &&
    esResumenAccionesRequeridas(requiredActions) &&
    (preferences?.fid_admin_level_0 === null ||
      typeof preferences?.fid_admin_level_0 === "string") &&
    (preferences?.fid_zonas_horarias === null ||
      typeof preferences?.fid_zonas_horarias === "string") &&
    typeof preferences?.zona_horaria === "string";

  if (!valid) throw new Error("Invalid user context returned by API.");
  return data as unknown as UserContext;
}

/** Cookies que deben existir antes del primer pintado después del login/SSR. */
export function applyPreferenceCookies(
  cookies: Cookies,
  url: URL,
  preferences: UserPreferences,
): void {
  const options = {
    path: "/",
    maxAge: PREFERENCE_COOKIE_MAX_AGE,
    sameSite: "lax" as const,
    secure: url.protocol === "https:",
    // Tema e idioma no son secretos: el navegador debe poder actualizarlos
    // también cuando ya no existe una sesión autenticada.
    httpOnly: false,
  };
  if (preferences.tema) {
    cookies.set(THEME_MODE_COOKIE, preferences.tema, options);
    if (preferences.tema === "light" || preferences.tema === "dark") {
      cookies.set(THEME_COOKIE, preferences.tema, options);
    }
  }
  if (preferences.idioma) cookies.set(COOKIE, preferences.idioma, options);
}
