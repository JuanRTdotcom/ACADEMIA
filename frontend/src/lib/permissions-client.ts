/**
 * Helper de cliente para verificar autorización por permisos en SvelteKit.
 * Retorna true si el usuario posee al menos uno de los códigos de permiso especificados.
 */
export function tienePermiso(
  permisosUsuario: string[] | undefined | null,
  ...codigosRequeridos: string[]
): boolean {
  if (!permisosUsuario || permisosUsuario.length === 0) return false;
  return codigosRequeridos.some((codigo) => permisosUsuario.includes(codigo));
}
