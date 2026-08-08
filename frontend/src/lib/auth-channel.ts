import { browser } from "$app/environment";

/**
 * Canal entre pestañas del mismo navegador y origen (BroadcastChannel). Sincroniza el
 * estado de sesión sin servidor: cerrar sesión en una pestaña bota a las demás; iniciar
 * sesión redirige las que estén en el login. Solo cubre el mismo navegador (no otros
 * dispositivos); es pulido de UX, no una barrera de seguridad.
 */
const NAME = "sumaq-auth";
export type AuthEvent = "logout" | "login";

/**
 * Emite en un canal recién creado por mensaje. Un canal efímero se despacha de forma
 * fiable a las demás pestañas aunque esta esté a punto de navegar; el cierre se difiere
 * un tick para no cortar la entrega.
 */
export function broadcastAuth(event: AuthEvent): void {
  if (!browser) return; // en SSR no existe BroadcastChannel
  const channel = new BroadcastChannel(NAME);
  channel.postMessage(event);
  setTimeout(() => channel.close(), 0);
}

/** Suscribe un handler a los eventos de sesión; devuelve la función para desuscribirse. */
export function subscribeAuth(handler: (event: AuthEvent) => void): () => void {
  if (!browser) return () => {};
  const channel = new BroadcastChannel(NAME);
  const listener = (e: MessageEvent<AuthEvent>) => handler(e.data);
  channel.addEventListener("message", listener);
  return () => channel.close();
}
