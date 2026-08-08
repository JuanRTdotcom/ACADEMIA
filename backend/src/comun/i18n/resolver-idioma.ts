import type { Request } from "express"; // Express: petición HTTP (trae headers y, si hay sesión, user)
import { normalizarIdioma, type Idioma } from "./idiomas";

/**
 * Resuelve el idioma de la respuesta para una petición.
 *
 * - Primero usa Accept-Language: representa la preferencia mutable de esta petición.
 * - Si no llega, usa el idioma del JWT como respaldo para clientes antiguos.
 * - Si nada aplica: idioma por defecto (inglés).
 */
export function resolverIdioma(peticion: Request): Idioma {
  const primera = peticion.get("accept-language")?.split(",")[0];
  if (primera) return normalizarIdioma(primera);

  const usuario = (peticion as Request & { user?: { idioma?: string } }).user;
  return normalizarIdioma(usuario?.idioma);
}
