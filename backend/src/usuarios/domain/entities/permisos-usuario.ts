export interface ModuloPermisosUsuario {
  id_modulos: string;
  fid_modulos_padre: string | null;
  acceso_usuario_obligatorio: boolean;
  permisos: Array<{ id_permisos: string; pertenece_al_rol: boolean }>;
}

/** Un switch de módulo representa todos los permisos de su árbol completo. */
export function normalizarPermisosPorModulo(
  modulos: ModuloPermisosUsuario[],
  permisosSolicitados: string[],
): string[] | null {
  const solicitados = new Set(permisosSolicitados);
  const conocidos = new Set(modulos.flatMap((modulo) => modulo.permisos.map(({ id_permisos }) => id_permisos)));
  if (permisosSolicitados.some((permiso) => !conocidos.has(permiso))) return null;

  const porId = new Map(modulos.map((modulo) => [modulo.id_modulos, modulo]));
  const idRaiz = (modulo: ModuloPermisosUsuario): string => {
    const visitados = new Set<string>();
    let actual = modulo;
    while (actual.fid_modulos_padre && porId.has(actual.fid_modulos_padre) && !visitados.has(actual.id_modulos)) {
      visitados.add(actual.id_modulos);
      actual = porId.get(actual.fid_modulos_padre)!;
    }
    return actual.id_modulos;
  };
  const grupos = new Map<string, ModuloPermisosUsuario[]>();
  for (const modulo of modulos) {
    const raiz = idRaiz(modulo);
    grupos.set(raiz, [...(grupos.get(raiz) ?? []), modulo]);
  }

  const efectivos = new Set<string>();
  for (const grupo of grupos.values()) {
    const obligatorio = grupo.some((modulo) => modulo.acceso_usuario_obligatorio);
    const perteneceAlRol = grupo.some((modulo) => modulo.permisos.some((permiso) => permiso.pertenece_al_rol));
    const fueSeleccionado = grupo.some((modulo) => modulo.permisos.some(({ id_permisos }) => solicitados.has(id_permisos)));
    if (obligatorio || (perteneceAlRol && fueSeleccionado)) {
      grupo.forEach((modulo) => modulo.permisos.forEach(({ id_permisos }) => efectivos.add(id_permisos)));
    } else if (fueSeleccionado) {
      return null;
    }
  }
  return [...efectivos];
}
