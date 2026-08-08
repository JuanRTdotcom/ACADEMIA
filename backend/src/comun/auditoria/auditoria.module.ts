import { Global, Module } from "@nestjs/common"; // NestJS: @Global lo expone a toda la app sin reimportar
import { ServicioAuditoria } from "./servicio-auditoria";

/** Expone ServicioAuditoria de forma global: cualquier módulo puede auditar. */
@Global()
@Module({
  providers: [ServicioAuditoria],
  exports: [ServicioAuditoria],
})
export class ModuloAuditoria {}
