/** Toda página dentro de (app) debe declarar aquí el acceso mínimo para SSR. */
const rules = [
  { prefix: "/administrator/company", permission: null },
  { prefix: "/administrator/users", permission: null },
  { prefix: "/superadmin/roles", permission: null },
  { prefix: "/superadmin/countries", permission: null },
  { prefix: "/superadmin/users", permission: null },
  { prefix: "/superadmin/companies", permission: null },
  { prefix: "/superadmin/plans", permission: null },
  { prefix: "/superadmin/subscriptions", permission: null },
  { prefix: "/dashboard", permission: null },
  { prefix: "/recursos", permission: null },
  { prefix: "/profile", permission: null },
] as const;

/** undefined = ruta sin política (fail-closed); null = solo exige autenticación. */
export function requiredPermission(
  pathname: string,
): string | null | undefined {
  return rules.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.permission;
}
