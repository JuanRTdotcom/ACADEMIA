const PATRON_SEGMENTO = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

/**
 * Evita claves ambiguas, traversal, controles y rutas absolutas.
 * Los módulos consumidores deben usar el prefijo tenants/<organizacion>/...
 */
export function validarClaveAlmacenamiento(clave: string): string {
  if (clave.length === 0 || clave.length > 1024 || clave.startsWith("/")) {
    throw new Error("La clave del objeto no tiene un formato válido");
  }

  const segmentos = clave.split("/");
  if (
    segmentos.some(
      (segmento) =>
        segmento === "." ||
        segmento === ".." ||
        !PATRON_SEGMENTO.test(segmento),
    )
  ) {
    throw new Error("La clave del objeto no tiene un formato válido");
  }
  return clave;
}

/** Impide inyección de cabeceras al sugerir el nombre de una descarga. */
export function normalizarNombreDescarga(nombre: string): string {
  const limpio = nombre
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f/\\]/g, "_")
    .trim();
  if (!limpio || limpio.length > 180) {
    throw new Error("El nombre de descarga no tiene un formato válido");
  }
  return limpio;
}
