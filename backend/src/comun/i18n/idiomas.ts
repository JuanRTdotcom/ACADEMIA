// Idiomas soportados por las respuestas del API. El default es inglés cuando no
// se conoce el idioma del usuario (ej. login sin sesión, o preferencia sin definir).
export const IDIOMAS_SOPORTADOS = ["en", "es"] as const;
export type Idioma = (typeof IDIOMAS_SOPORTADOS)[number];
export const IDIOMA_POR_DEFECTO: Idioma = "en";

/**
 * Normaliza cualquier entrada a un idioma soportado.
 * Toma solo la etiqueta base ("es-PE" → "es"); si no está soportado, usa el default.
 */
export function normalizarIdioma(valor?: string | null): Idioma {
  const base = (valor ?? "").trim().toLowerCase().split("-")[0];
  return (IDIOMAS_SOPORTADOS as readonly string[]).includes(base)
    ? (base as Idioma)
    : IDIOMA_POR_DEFECTO;
}
