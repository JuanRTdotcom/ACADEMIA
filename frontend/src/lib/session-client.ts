import { goto } from "$app/navigation";
import { broadcastAuth } from "$lib/auth-channel";

// Una sola promesa compartida evita dos POST y dos navegaciones cuando el usuario
// hace doble clic o el evento SSE de revocación llega durante el cierre manual.
let cierreEnCurso: Promise<void> | null = null;

/**
 * Cierra la sesión en este navegador y sincroniza. Primero limpia cookies en el server
 * (/logout revoca y borra), LUEGO avisa a otras pestañas (BroadcastChannel) para que no
 * reboten con la cookie aún puesta, y navega al login. Lo usan el botón de logout y el
 * handler del stream SSE (cuando el server revoca la sesión desde otro lado).
 */
export function cerrarSesionLocal(): Promise<void> {
  if (cierreEnCurso) return cierreEnCurso;

  cierreEnCurso = ejecutarCierre().finally(() => {
    cierreEnCurso = null;
  });

  return cierreEnCurso;
}

async function ejecutarCierre(): Promise<void> {
  try {
    // El endpoint responde 204: solo limpia la sesión; no intenta redirigir por su cuenta.
    await fetch("/logout", { method: "POST" });
  } finally {
    // Aunque falle la red, este navegador deja de tratar la sesión como utilizable.
    broadcastAuth("logout");
    await goto("/login", { invalidateAll: true });
  }
}
