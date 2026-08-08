import { Global, Module } from "@nestjs/common"; // NestJS: @Global lo expone a toda la app sin reimportar
import { ServicioPush } from "./servicio-push";

/** Expone ServicioPush de forma global: cualquier módulo puede enviar notificaciones. */
@Global()
@Module({
  providers: [ServicioPush],
  exports: [ServicioPush],
})
export class ModuloPush {}
