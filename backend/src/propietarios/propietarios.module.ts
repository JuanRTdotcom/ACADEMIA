import { Module } from "@nestjs/common";
import { FuenteDatosPropietariosPrisma } from "./data/datasources/propietarios-prisma.datasource";
import { RepositorioPropietariosDatos } from "./data/repositories/repositorio-propietarios.impl";
import { RepositorioPropietarios } from "./domain/repositories/repositorio-propietarios";
import { CasoUsoGestionarPropietarios } from "./domain/usecases/gestionar-propietarios";
import { ControladorPropietarios } from "./presentation/controllers/propietarios.controller";
import { ModuloTokenOpaco } from "../comun/seguridad/token-opaco.module";

@Module({
  imports: [ModuloTokenOpaco],
  controllers: [ControladorPropietarios],
  providers: [
    FuenteDatosPropietariosPrisma,
    RepositorioPropietariosDatos,
    {
      provide: RepositorioPropietarios,
      useExisting: RepositorioPropietariosDatos,
    },
    CasoUsoGestionarPropietarios,
  ],
})
export class ModuloPropietarios {}
