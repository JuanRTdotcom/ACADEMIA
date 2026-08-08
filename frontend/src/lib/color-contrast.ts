/** Acepta exclusivamente colores hexadecimales completos aptos para estilos inline. */
export function normalizeHexColor(value: string | null | undefined): string | undefined {
	return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : undefined;
}

/** Elige blanco o negro según el mayor contraste WCAG con el fondo recibido. */
export function prefersLightText(hex: string | undefined): boolean {
	if (!hex) return false;
	const channels = [1, 3, 5].map((position) => {
		const value = Number.parseInt(hex.slice(position, position + 2), 16) / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
	return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05;
}

const DEFAULT_PRIMARY_LIGHT = '#0075DE';

function mixHex(base: string, target: string, amount: number): string {
	const channel = (value: string, position: number) => Number.parseInt(value.slice(position, position + 2), 16);
	const mixed = [1, 3, 5].map((position) =>
		Math.round(channel(base, position) * (1 - amount) + channel(target, position) * amount)
	);
	return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function relativeLuminance(hex: string): number {
	const channels = [1, 3, 5].map((position) => {
		const value = Number.parseInt(hex.slice(position, position + 2), 16) / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first: string, second: string): number {
	const high = Math.max(relativeLuminance(first), relativeLuminance(second));
	const low = Math.min(relativeLuminance(first), relativeLuminance(second));
	return (high + 0.05) / (low + 0.05);
}

/**
 * Convierte el color institucional guardado en los tokens globales del tema.
 * El tema oscuro aclara únicamente colores demasiado oscuros para conservar
 * contraste; el valor persistido continúa siendo una sola fuente de verdad.
 */
export function brandThemeStyle(seed: string | null | undefined, dark: boolean): string {
	const normalized = normalizeHexColor(seed)?.toUpperCase();
	if (!normalized || normalized === DEFAULT_PRIMARY_LIGHT) return '';

	let primary = normalized;
	if (dark) {
		for (let step = 0; step < 4 && relativeLuminance(primary) < 0.24; step += 1) {
			primary = mixHex(primary, '#FFFFFF', 0.16);
		}
	}

	const pressed = mixHex(primary, '#000000', dark ? 0.14 : 0.2);
	// El blanco conserva el lenguaje visual de los botones institucionales siempre
	// que alcance AA. Solo recurrimos al texto oscuro cuando el blanco no es legible.
	const onPrimary = contrastRatio(primary, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#06131F';
	const navy = mixHex(normalized, '#172554', 0.48);
	const navyDeep = mixHex(normalized, '#0B1224', 0.66);
	const navyMid = mixHex(normalized, '#1E293B', 0.32);

	return [
		`--primary:${primary}`,
		`--primary-pressed:${pressed}`,
		`--on-primary:${onPrimary}`,
		`--link-blue:${primary}`,
		`--link-blue-pressed:${pressed}`,
		`--brand-navy:${navy}`,
		`--brand-navy-deep:${navyDeep}`,
		`--brand-navy-mid:${navyMid}`
	].join(';');
}

/** Color canónico que representa el aspecto predeterminado en el formulario. */
export const DEFAULT_BRAND_PRIMARY = DEFAULT_PRIMARY_LIGHT;
