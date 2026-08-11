export type RoleWithPermissions = { id_roles: string; permisos: string[] };
export type ModuleWithPermissions<TPermission extends { id_permisos: string } = { id_permisos: string }> = {
  id_modulos: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string | null;
  fid_modulos_padre: string | null;
  acceso_usuario_obligatorio: boolean;
  permisos: TPermission[];
};

export function permissionsForRoles(
  roleIds: string[],
  roles: RoleWithPermissions[],
  available: Set<string>,
): string[] {
  return [...new Set(
    roles
      .filter((role) => roleIds.includes(role.id_roles))
      .flatMap((role) => role.permisos)
      .filter((permission) => available.has(permission)),
  )];
}

/** Agrupa cada árbol por su módulo raíz y reúne los permisos de sus descendientes. */
export function groupModulesByRoot<
  TPermission extends { id_permisos: string },
  T extends ModuleWithPermissions<TPermission>,
>(modules: T[]): T[] {
  const byId = new Map(modules.map((module) => [module.id_modulos, module]));
  const rootOf = (module: T): T => {
    const visited = new Set<string>();
    let current = module;
    while (current.fid_modulos_padre && byId.has(current.fid_modulos_padre) && !visited.has(current.id_modulos)) {
      visited.add(current.id_modulos);
      current = byId.get(current.fid_modulos_padre)!;
    }
    return current;
  };
  const groups = new Map<string, T>();
  for (const module of modules) {
    const root = rootOf(module);
    const existing = groups.get(root.id_modulos);
    groups.set(root.id_modulos, {
      ...root,
      permisos: [...(existing?.permisos ?? []), ...module.permisos].filter(
        (permission, index, all) => all.findIndex(({ id_permisos }) => id_permisos === permission.id_permisos) === index,
      ),
    } as T);
  }
  return [...groups.values()];
}

/** Módulos raíz configurables cubiertos por al menos uno de los roles elegidos. */
export function modulesForRoles<T extends ModuleWithPermissions>(
  roleIds: string[],
  roles: RoleWithPermissions[],
  modules: T[],
): T[] {
  const inherited = new Set(
    roles.filter((role) => roleIds.includes(role.id_roles)).flatMap((role) => role.permisos),
  );
  return groupModulesByRoot(modules).filter(
    (module) =>
      !module.acceso_usuario_obligatorio &&
      module.permisos.some(({ id_permisos }) => inherited.has(id_permisos)),
  );
}

/** Un rol habilita módulos completos para la personalización del usuario. */
export function permissionsForRoleModules<T extends ModuleWithPermissions>(
  roleIds: string[],
  roles: RoleWithPermissions[],
  modules: T[],
): string[] {
  return modulesForRoles(roleIds, roles, modules).flatMap((module) =>
    module.permisos.map(({ id_permisos }) => id_permisos),
  );
}

/** Conserva excepciones explícitas y recalcula únicamente lo heredado. */
export function reconcileRoleChange(
  selected: string[],
  previousInherited: string[],
  nextInherited: string[],
): string[] {
  const previous = new Set(previousInherited);
  const denied = new Set(previousInherited.filter((permission) => !selected.includes(permission)));
  const explicitAllowed = selected.filter((permission) => !previous.has(permission));
  return [...new Set([...explicitAllowed, ...nextInherited.filter((permission) => !denied.has(permission))])];
}
