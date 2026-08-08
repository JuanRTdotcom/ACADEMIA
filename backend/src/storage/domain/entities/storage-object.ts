/** Datos mínimos de un objeto guardado en el proveedor externo. */
export interface ObjetoAlmacenado {
  clave: string;
  bytes: number;
  tipoContenido: string | null;
  etag: string | null;
  ultimaModificacion: Date | null;
}

/** Objeto privado leído por el backend; apropiado para archivos pequeños. */
export interface ObjetoConContenido extends ObjetoAlmacenado {
  contenido: Uint8Array;
}

/** URL temporal; no contiene ni expone las credenciales permanentes de R2. */
export interface AccesoFirmado {
  url: string;
  expiraEnSegundos: number;
  encabezados: Record<string, string>;
}

/** Parámetros que quedan incluidos en la firma de una carga directa. */
export interface SolicitudCargaFirmada {
  clave: string;
  tipoContenido: string;
  bytes: number;
  checksumSha256Base64?: string;
}

/** Escritura directa desde el backend después de procesar contenido sensible. */
export interface SolicitudGuardarObjeto {
  clave: string;
  contenido: Uint8Array;
  tipoContenido: string;
  checksumSha256Base64?: string;
  cacheControl?: string;
}
