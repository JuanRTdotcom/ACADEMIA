import { Global, Module } from "@nestjs/common"; // NestJS: @Global expone el provider a toda la app sin reimportar; @Module declara el módulo
import { ServicioTraduccion } from "./servicio-traduccion";

/** Expone ServicioTraduccion de forma global (lo usan el filtro y cualquier módulo). */
@Global()
@Module({
  providers: [ServicioTraduccion],
  exports: [ServicioTraduccion],
})
export class ModuloI18n {}
