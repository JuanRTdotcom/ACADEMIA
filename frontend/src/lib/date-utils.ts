import { i18n } from "$lib";

/**
 * Convierte un ISO String o un objeto Date a formato legible de fecha corta (dd/mm/aaaa)
 * asegurando la zona horaria UTC o la indicada por parámetros.
 */
export function formatLocalDate(isoStringOrDate: string | Date | null | undefined, timeZone: string = "UTC"): string {
	if (!isoStringOrDate) return "—";
	const dateObj = typeof isoStringOrDate === "string" ? new Date(isoStringOrDate) : isoStringOrDate;
	const locale = i18n.locale === "es" ? "es-PE" : "en-US";
	return new Intl.DateTimeFormat(locale, {
		timeZone,
		day: "2-digit",
		month: "2-digit",
		year: "numeric"
	}).format(dateObj);
}

/**
 * Convierte un ISO String o un objeto Date a formato legible de fecha y hora completa (dd/mm/aaaa hh:mm:ss)
 * asegurando la zona horaria UTC o la indicada por parámetros.
 */
export function formatLocalDateTime(isoStringOrDate: string | Date | null | undefined, timeZone: string = "UTC"): string {
	if (!isoStringOrDate) return "—";
	const dateObj = typeof isoStringOrDate === "string" ? new Date(isoStringOrDate) : isoStringOrDate;
	const locale = i18n.locale === "es" ? "es-PE" : "en-US";
	return new Intl.DateTimeFormat(locale, {
		timeZone,
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false
	}).format(dateObj);
}
