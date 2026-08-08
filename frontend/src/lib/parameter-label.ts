import { i18n } from "./i18n/index.svelte";

export interface TranslatedParameter {
  etiqueta: string;
  traducciones: Record<string, string>;
}

/** Resuelve el texto usando el idioma activo; la etiqueta base es el fallback. */
export function parameterLabel(parameter: TranslatedParameter): string {
  return parameter.traducciones?.[i18n.locale] ?? parameter.etiqueta;
}
