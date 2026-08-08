import { SetMetadata } from "@nestjs/common"; // NestJS: adjunta metadata a una ruta/clase; un guardia la lee luego con Reflector

export const LLAVE_PERMISOS = "permisos";
/**
 * Declara qué permiso(s) exige una ruta: @Permisos('companies.read').
 * QUIÉN los tiene sale de la DB (roles→rolesPermisos→permisos), no del código.
 */
export const Permisos = (...permisos: string[]) =>
  SetMetadata(LLAVE_PERMISOS, permisos); // guarda los permisos; GuardiaPermisos los exige
