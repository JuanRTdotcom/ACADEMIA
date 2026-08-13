import { Module } from "@nestjs/common";
import { ServicioTokenOpaco } from "./token-opaco.service";

@Module({
  providers: [ServicioTokenOpaco],
  exports: [ServicioTokenOpaco],
})
export class ModuloTokenOpaco {}
