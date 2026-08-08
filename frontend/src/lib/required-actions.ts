import { browser } from '$app/environment';

const CANAL = 'sumaq-required-actions';
const EVENTO_LOCAL = 'sumaq:required-actions';
const STORAGE_FALLBACK = 'sumaq-required-actions-sync';

export interface ResumenAccionesRequeridas {
	total: number;
	por_seccion: Record<string, number>;
}

export function esResumenAccionesRequeridas(
	valor: unknown
): valor is ResumenAccionesRequeridas {
	if (typeof valor !== 'object' || valor === null) return false;
	const resumen = valor as Record<string, unknown>;
	if (!Number.isSafeInteger(resumen.total) || Number(resumen.total) < 0) return false;
	if (typeof resumen.por_seccion !== 'object' || resumen.por_seccion === null) return false;
	return Object.entries(resumen.por_seccion).every(
		([seccion, cantidad]) =>
			/^[a-z0-9_-]{1,60}$/.test(seccion) &&
			Number.isSafeInteger(cantidad) &&
			Number(cantidad) >= 0
	);
}

/** Actualiza la pestaña actual y sincroniza las demás pestañas del navegador. */
export function emitirResumenAcciones(resumen: ResumenAccionesRequeridas): void {
	if (!browser || !esResumenAccionesRequeridas(resumen)) return;
	window.dispatchEvent(new CustomEvent(EVENTO_LOCAL, { detail: resumen }));
	if ('BroadcastChannel' in window) {
		const canal = new BroadcastChannel(CANAL);
		canal.postMessage(resumen);
		setTimeout(() => canal.close(), 0);
		return;
	}
	localStorage.setItem(
		STORAGE_FALLBACK,
		JSON.stringify({ ...resumen, nonce: `${Date.now()}-${Math.random()}` })
	);
}

export function suscribirResumenAcciones(
	manejar: (resumen: ResumenAccionesRequeridas) => void
): () => void {
	if (!browser) return () => {};
	const local = (evento: Event) => {
		const valor = (evento as CustomEvent<unknown>).detail;
		if (esResumenAccionesRequeridas(valor)) manejar(valor);
	};
	const storage = (evento: StorageEvent) => {
		if (evento.key !== STORAGE_FALLBACK || !evento.newValue) return;
		try {
			const valor: unknown = JSON.parse(evento.newValue);
			if (esResumenAccionesRequeridas(valor)) manejar(valor);
		} catch {
			// Un dato local inválido nunca cambia el contador visible.
		}
	};
	window.addEventListener(EVENTO_LOCAL, local);
	window.addEventListener('storage', storage);
	const canal = 'BroadcastChannel' in window ? new BroadcastChannel(CANAL) : null;
	const remoto = (evento: MessageEvent<unknown>) => {
		if (esResumenAccionesRequeridas(evento.data)) manejar(evento.data);
	};
	canal?.addEventListener('message', remoto);
	return () => {
		window.removeEventListener(EVENTO_LOCAL, local);
		window.removeEventListener('storage', storage);
		canal?.close();
	};
}
