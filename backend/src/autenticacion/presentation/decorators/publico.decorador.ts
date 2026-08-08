import { SetMetadata } from "@nestjs/common"; // NestJS: adjunta metadata a una ruta/clase; un guardia la lee luego con Reflector

export const LLAVE_PUBLICO = "esPublico";
/** Marca una ruta como pública (no exige token de acceso). */
export const Publico = () => SetMetadata(LLAVE_PUBLICO, true); // guarda esPublico=true; GuardiaAcceso lo lee para saltar la auth
