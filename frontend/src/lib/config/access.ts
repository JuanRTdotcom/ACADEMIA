import type { UserContext } from "$lib/server/user-context";

/** El catálogo de módulos/rutas viene de PostgreSQL en el contexto autenticado. */
export function canAccessRoute(
  pathname: string,
  modulos: UserContext["modulos"],
): boolean {
  return modulos.some(
    ({ ruta }) => ruta !== null && (
      pathname === ruta || pathname.startsWith(`${ruta}/`) || ruta.startsWith(`${pathname}/`)
    ),
  );
}

/** Compatibilidad temporal para rutas personales sin módulo navegable. */
const personalRoutes = [
  { prefix: "/dashboard", permission: null },
  { prefix: "/recursos", permission: null },
  { prefix: "/profile", permission: null },
] as const;

/** undefined = ruta sin política (fail-closed); null = solo exige autenticación. */
export function requiredPermission(pathname: string): string | null | undefined {
  return personalRoutes.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.permission;
}
