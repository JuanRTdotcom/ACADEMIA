export const ICONOS_ROL = [
  "shield",
  "shield-check",
  "user-cog",
  "users",
  "graduation-cap",
  "briefcase-business",
  "key-round",
  "badge-check",
] as const;

export type IconoRol = (typeof ICONOS_ROL)[number];

export interface DatosRol {
  nombre: string;
  alias: string;
  descripcion: string;
  icono: IconoRol;
}

export interface RolListado extends DatosRol {
  id_roles: string;
  estado: number;
  created_at: Date;
}

/** Catálogo que se muestra en la llave del rol. Aún no persiste cambios. */
export interface PermisoCatalogo {
  id_permisos: string;
  codigo: string;
  accion: string;
  descripcion: string | null;
  asignado: boolean;
}

export interface ModuloPermisos {
  id_modulos: string;
  codigo: string;
  nombre: string;
  icono: string | null;
  ruta: string | null;
  permisos: PermisoCatalogo[];
}

export interface CatalogoPermisosRol {
  rol: Pick<RolListado, "id_roles" | "nombre" | "alias" | "icono" | "estado">;
  modulos: ModuloPermisos[];
}
