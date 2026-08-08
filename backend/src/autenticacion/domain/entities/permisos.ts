/** Une los permisos activos de todos los roles y elimina duplicados. */
export function permisosDeRoles(
  usuarios_roles: {
    rol: { roles_permisos: { permiso: { codigo: string } }[] };
  }[],
): string[] {
  const permisos = new Set<string>();
  for (const usuarioRol of usuarios_roles) {
    for (const rolPermiso of usuarioRol.rol.roles_permisos) {
      permisos.add(rolPermiso.permiso.codigo);
    }
  }
  return [...permisos];
}
