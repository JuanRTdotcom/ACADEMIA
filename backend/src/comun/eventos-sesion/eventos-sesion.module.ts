import { Global, Module } from "@nestjs/common";
import { ServicioEventosSesion } from "./servicio-eventos-sesion";

/** Global: el bus de eventos lo inyectan tanto auth (emite) como el SSE (consume). */
@Global()
@Module({
  providers: [ServicioEventosSesion],
  exports: [ServicioEventosSesion],
})
export class ModuloEventosSesion {}
