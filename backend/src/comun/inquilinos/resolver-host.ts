/**
 * Extrae el subdominio (slug de organización) de un host, restando el dominio base.
 * Función pura y reutilizable: la usan el login y la validación de tenant. No cuenta
 * puntos, así funciona igual con domains de dos niveles (sumaq.com.pe).
 *
 * @param host  Host crudo (ej. "admin.localhost:5173" o valores separados por coma de X-Forwarded-Host).
 * @param base  Dominio raíz del SaaS ya normalizado (ej. "localhost", "sumaq.com").
 * @returns     El subdominio útil, o undefined si el host es el dominio raíz, www, api o desconocido.
 */
export function resolverSubdomain(
  host: string,
  base: string,
): string | undefined {
  // Primer valor si vienen varios; sin puerto; en minúsculas.
  const limpio = host.split(",")[0].trim().split(":")[0].toLowerCase();

  // Dominio raíz o su www → no hay tenant.
  if (!limpio || limpio === base || limpio === `www.${base}`) return undefined;

  // Host bajo el dominio raíz: resta el sufijo `.base` y toma la primera etiqueta.
  if (limpio.endsWith(`.${base}`)) {
    const sub = limpio.slice(0, -(base.length + 1)).split(".")[0];
    if (sub && !["www", "api"].includes(sub)) return sub;
  }

  // Host desconocido (dominio propio de un cliente u otro): sin subdominio útil.
  return undefined;
}
