import type { Handle } from "@sveltejs/kit";
import { COOKIE, normalizeLocale } from "$lib/i18n/index.svelte";
import { hasSession } from "$lib/server/session";

/** SSR: el idioma se resuelve en el servidor desde la cookie y se inyecta en <html lang>. */
export const handle: Handle = async ({ event, resolve }) => {
  // Estado de sesión disponible para todos los load/action vía event.locals.
  // La validación de tenant vive en +layout.server.ts (un error en un load renderiza
  // +error.svelte con diseño; un error en este hook usaría la plantilla fallback).
  event.locals.isAuthenticated = hasSession(event.cookies);

  const response = await resolve(event, {
    // Un layout hijo puede restaurar la preferencia desde DB durante este resolve.
    transformPageChunk: ({ html }) =>
      html.replace("%lang%", normalizeLocale(event.cookies.get(COOKIE))),
  });

  // Las respuestas dinámicas siempre deben volver al servidor. Las rutas privadas
  // versionadas conservan la caché segura validada por su endpoint; errores y
  // respuestas sin versión siguen no-store.
  const esRutaImagenVersionada =
    event.url.pathname === "/media/avatar" ||
    /^\/media\/(tenant|company)\//.test(event.url.pathname) ||
    /^\/media\/pets\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.jpg$/i.test(
      event.url.pathname,
    ) ||
    /^\/media\/attentions\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/records\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/attachments\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
      event.url.pathname,
    ) ||
    /^\/media\/users\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/avatar\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.jpg$/i.test(
      event.url.pathname,
    );
  const esImagenVersionadaCacheable =
    esRutaImagenVersionada &&
    Boolean(response.headers.get("etag")) &&
    response.ok &&
    ["image/jpeg", "image/png", "image/webp"].includes(
      response.headers.get("content-type") ?? "",
    ) &&
    /\b(private|public)\b/.test(response.headers.get("cache-control") ?? "") &&
    response.headers.get("cache-control")?.includes("no-store") === false;

  if (!esImagenVersionadaCacheable) {
    response.headers.set(
      "cache-control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    response.headers.set("pragma", "no-cache");
    response.headers.set("expires", "0");
    response.headers.set("surrogate-control", "no-store");
    response.headers.delete("etag");
  }

  return response;
};
