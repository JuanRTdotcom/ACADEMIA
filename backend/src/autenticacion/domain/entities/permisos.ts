export type PermisoAutorizable = { codigo: string; fid_modulos: string };

/** Plan limita; roles conceden; permitir agrega y denegar siempre prevalece. */
export function permisosEfectivos(
  usuarios_roles: {
    rol: { roles_permisos: { permiso: PermisoAutorizable }[] };
  }[],
  excepciones: { efecto: "permitir" | "denegar"; permiso: PermisoAutorizable }[],
  modulosPlan: string[],
): PermisoAutorizable[] {
  const modulos = new Set(modulosPlan);
  const permisos = new Map<string, PermisoAutorizable>();
  for (const usuarioRol of usuarios_roles) {
    for (const rolPermiso of usuarioRol.rol.roles_permisos) {
      if (modulos.has(rolPermiso.permiso.fid_modulos)) {
        permisos.set(rolPermiso.permiso.codigo, rolPermiso.permiso);
      }
    }
  }
  for (const excepcion of excepciones) {
    if (!modulos.has(excepcion.permiso.fid_modulos)) continue;
    if (excepcion.efecto === "denegar") permisos.delete(excepcion.permiso.codigo);
    else permisos.set(excepcion.permiso.codigo, excepcion.permiso);
  }
  return [...permisos.values()];
}
