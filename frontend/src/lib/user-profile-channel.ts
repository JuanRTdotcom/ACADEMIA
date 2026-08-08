import { browser } from "$app/environment";

const CANAL = "sumaq-user-profile";
const EVENTO_LOCAL = "sumaq:user-profile";
const STORAGE_FALLBACK = "sumaq-user-profile-sync";

export interface UsuarioCabecera {
  id_usuarios: string;
  persona: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string | null;
  };
  roles: { codigo: string; nombre: string }[];
  avatar: { disponible: boolean; version: string | null };
}

export interface ActualizacionPerfilUsuario {
  id_usuarios: string;
  persona?: UsuarioCabecera["persona"];
  avatar?: UsuarioCabecera["avatar"];
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

/** No confía en mensajes del navegador sin comprobar su forma mínima. */
function esActualizacion(valor: unknown): valor is ActualizacionPerfilUsuario {
  if (!esRegistro(valor) || typeof valor.id_usuarios !== "string") return false;

  if (valor.persona !== undefined) {
    if (!esRegistro(valor.persona)) return false;
    if (
      typeof valor.persona.nombres !== "string" ||
      valor.persona.nombres.length > 50 ||
      typeof valor.persona.apellido_paterno !== "string" ||
      valor.persona.apellido_paterno.length > 30 ||
      (valor.persona.apellido_materno !== null &&
        (typeof valor.persona.apellido_materno !== "string" ||
          valor.persona.apellido_materno.length > 30))
    ) {
      return false;
    }
  }

  if (valor.avatar !== undefined) {
    if (!esRegistro(valor.avatar)) return false;
    if (
      typeof valor.avatar.disponible !== "boolean" ||
      (valor.avatar.version !== null &&
        typeof valor.avatar.version !== "string")
    ) {
      return false;
    }
  }

  return valor.persona !== undefined || valor.avatar !== undefined;
}

/** Actualiza esta pestaña y luego avisa a las demás del mismo origen. */
export function emitirActualizacionPerfil(
  actualizacion: ActualizacionPerfilUsuario,
): void {
  if (!browser || !esActualizacion(actualizacion)) return;

  window.dispatchEvent(
    new CustomEvent(EVENTO_LOCAL, { detail: actualizacion }),
  );

  if ("BroadcastChannel" in window) {
    const canal = new BroadcastChannel(CANAL);
    canal.postMessage(actualizacion);
    setTimeout(() => canal.close(), 0);
    return;
  }

  // Navegadores antiguos: storage notifica únicamente a las otras pestañas.
  localStorage.setItem(
    STORAGE_FALLBACK,
    JSON.stringify({
      ...actualizacion,
      nonce: `${Date.now()}-${Math.random()}`,
    }),
  );
}

/** Escucha cambios locales y remotos; devuelve la limpieza del componente. */
export function suscribirActualizacionesPerfil(
  manejar: (actualizacion: ActualizacionPerfilUsuario) => void,
): () => void {
  if (!browser) return () => {};

  const local = (evento: Event) => {
    const valor = (evento as CustomEvent<unknown>).detail;
    if (esActualizacion(valor)) manejar(valor);
  };
  const storage = (evento: StorageEvent) => {
    if (evento.key !== STORAGE_FALLBACK || !evento.newValue) return;
    try {
      const valor: unknown = JSON.parse(evento.newValue);
      if (esActualizacion(valor)) manejar(valor);
    } catch {
      // Un valor local inválido se ignora; nunca modifica la identidad visible.
    }
  };

  window.addEventListener(EVENTO_LOCAL, local);
  window.addEventListener("storage", storage);

  const canal =
    "BroadcastChannel" in window ? new BroadcastChannel(CANAL) : null;
  const remoto = (evento: MessageEvent<unknown>) => {
    if (esActualizacion(evento.data)) manejar(evento.data);
  };
  canal?.addEventListener("message", remoto);

  return () => {
    window.removeEventListener(EVENTO_LOCAL, local);
    window.removeEventListener("storage", storage);
    canal?.close();
  };
}
