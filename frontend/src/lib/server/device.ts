import type { RequestEvent } from "@sveltejs/kit";

// Nombre de la cookie que identifica de forma estable este navegador/dispositivo.
const DEVICE_COOKIE = "device_id";
// Vida larga (~400 días, el máximo que respetan los navegadores). No es una
// credencial: solo reconoce el equipo para agrupar sesiones y detectar logins nuevos.
const DEVICE_MAX_AGE = 400 * 24 * 60 * 60;

/**
 * Devuelve el id de dispositivo del navegador. Si aún no existe, genera un UUID y
 * lo guarda en una cookie persistente httpOnly. El mismo navegador reenvía el mismo
 * id en cada login → el backend reconoce el dispositivo (conocido vs nuevo).
 */
export function getOrCreateDeviceId(event: RequestEvent): string {
  const existing = event.cookies.get(DEVICE_COOKIE);
  if (existing) return existing;

  const id = crypto.randomUUID(); // Web Crypto global (disponible en el runtime SvelteKit)
  event.cookies.set(DEVICE_COOKIE, id, {
    path: "/",
    httpOnly: true, // el JS del navegador no lo lee
    sameSite: "lax",
    secure: event.url.protocol === "https:", // solo HTTPS en prod
    maxAge: DEVICE_MAX_AGE,
  });
  return id;
}
