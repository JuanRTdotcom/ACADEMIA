interface FilaParametroTraducible {
  codigo: string;
  etiqueta: string;
  traducciones: { codigo_idioma: string; etiqueta: string }[];
}

/** Convierte las filas normalizadas de idiomas en un mapa cómodo para la API. */
export function mapearParametroTraducible<T extends FilaParametroTraducible>(
  fila: T,
): Omit<T, "traducciones"> & { traducciones: Record<string, string> } {
  return {
    ...fila,
    traducciones: Object.fromEntries(
      fila.traducciones.map(({ codigo_idioma, etiqueta }) => [
        codigo_idioma,
        etiqueta,
      ]),
    ),
  };
}

export const seleccionarTraduccionesParametro = {
  select: { codigo_idioma: true, etiqueta: true },
} as const;
