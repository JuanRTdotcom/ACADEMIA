import { SetMetadata } from "@nestjs/common"; // NestJS: adjunta metadata a una ruta/clase; un guardia la lee luego con Reflector

export const LLAVE_ROLES = "roles";
/** Restringe una ruta a ciertos roles: @Roles('ADMIN', 'PROFESOR'). */
export const Roles = (...roles: string[]) => SetMetadata(LLAVE_ROLES, roles); // guarda la lista de roles; GuardiaRoles la exige
