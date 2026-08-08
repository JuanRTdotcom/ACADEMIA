import { Global, Module } from "@nestjs/common";
import { ServicioRelojBaseDatos } from "./servicio-reloj-base-datos";

/** Expone el reloj de PostgreSQL a cualquier feature sin duplicar consultas. */
@Global()
@Module({
  providers: [ServicioRelojBaseDatos],
  exports: [ServicioRelojBaseDatos],
})
export class ModuloRelojBaseDatos {}
