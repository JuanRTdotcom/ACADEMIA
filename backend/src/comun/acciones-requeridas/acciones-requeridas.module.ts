import { Global, Module } from "@nestjs/common";
import { ServicioAccionesRequeridas } from "./servicio-acciones-requeridas";

@Global()
@Module({
  providers: [ServicioAccionesRequeridas],
  exports: [ServicioAccionesRequeridas],
})
export class ModuloAccionesRequeridas {}
