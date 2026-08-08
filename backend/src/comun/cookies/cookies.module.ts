import { Global, Module } from "@nestjs/common"; // NestJS: @Global lo expone a toda la app sin reimportar
import { ServicioCookies } from "./servicio-cookies";

/** Expone ServicioCookies de forma global: cualquier controlador puede usarlo. */
@Global()
@Module({
  providers: [ServicioCookies],
  exports: [ServicioCookies],
})
export class ModuloCookies {}
