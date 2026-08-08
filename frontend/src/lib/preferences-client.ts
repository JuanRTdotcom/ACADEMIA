import { browser } from "$app/environment";
import type { PreferencePatch } from "$lib/preferences";

const DELAY_MS = 200;
const RETRY_MS = 1_000;
const MAX_ATTEMPTS = 3;

let enabled = false;
let pending: PreferencePatch = {};
let timer: ReturnType<typeof setTimeout> | undefined;
let sending = false;
let attempts = 0;

function hasPending(): boolean {
  return (
    pending.tema !== undefined ||
    pending.idioma !== undefined ||
    pending.menu_colapsado !== undefined
  );
}

function schedule(delay = DELAY_MS): void {
  if (!browser || !enabled || sending || timer || !hasPending()) return;
  timer = setTimeout(() => {
    timer = undefined;
    void flush();
  }, delay);
}

/**
 * Envía un lote por vez. Si el usuario vuelve a cambiar mientras hay una petición,
 * el nuevo valor queda en pending y sale después: una respuesta lenta nunca pisa
 * una elección más reciente.
 */
async function flush(): Promise<void> {
  if (!enabled || sending || !hasPending()) return;

  sending = true;
  const batch = pending;
  pending = {};
  let retryDelay: number | undefined;

  try {
    const response = await fetch("/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(batch),
      keepalive: true,
    });

    if (response.status === 401 || response.status === 403) {
      // La sesión dejó de ser válida: no repetimos una petición que no puede guardar.
      enabled = false;
      pending = {};
      return;
    }
    if (!response.ok) throw new Error(`Preferences API ${response.status}`);
    attempts = 0;
  } catch {
    attempts += 1;
    // Los valores nuevos ganan sobre el lote fallido si modifican la misma clave.
    pending = { ...batch, ...pending };
    if (attempts < MAX_ATTEMPTS) retryDelay = RETRY_MS * attempts;
  } finally {
    sending = false;
    // Tras tres fallos queda pendiente, pero espera un nuevo cambio o volver online.
    if (retryDelay !== undefined) schedule(retryDelay);
    else if (attempts === 0) schedule();
  }
}

/** Activa el guardado remoto únicamente cuando el layout conoce una sesión. */
export function setPreferencePersistenceEnabled(value: boolean): void {
  enabled = value;
  if (!enabled) {
    pending = {};
    attempts = 0;
    if (timer) clearTimeout(timer);
    timer = undefined;
  }
}

/** Cola optimista: el cambio visual ya ocurrió; esta función solo persiste después. */
export function queuePreference(patch: PreferencePatch): void {
  if (!browser || !enabled) return;
  pending = { ...pending, ...patch };
  attempts = 0;
  schedule();
}

if (browser) {
  // Si las tres tentativas fallaron por desconexión, volver a estar online reanuda.
  window.addEventListener("online", () => {
    attempts = 0;
    schedule();
  });

  // Si la pestaña se cierra durante los 200 ms de agrupación, keepalive aún lo envía.
  window.addEventListener("pagehide", () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    void flush();
  });
}
