import { Module } from "@nestjs/common";
import { ModuloTokenOpaco } from "../comun/seguridad/token-opaco.module";
import { FuenteDatosProcedimientosVeterinariosPrisma } from "./data/datasources/procedimientos-veterinarios-prisma.datasource";
import { RepositorioProcedimientosVeterinariosDatos } from "./data/repositories/repositorio-procedimientos-veterinarios.impl";
import { RepositorioProcedimientosVeterinarios } from "./domain/repositories/repositorio-procedimientos-veterinarios";
import { CasoUsoGestionarProcedimientosVeterinarios } from "./domain/usecases/gestionar-procedimientos-veterinarios";
import { ControladorProcedimientosVeterinarios } from "./presentation/controllers/procedimientos-veterinarios.controller";

@Module({
  imports: [ModuloTokenOpaco],
  controllers: [ControladorProcedimientosVeterinarios],
  providers: [
    FuenteDatosProcedimientosVeterinariosPrisma,
    RepositorioProcedimientosVeterinariosDatos,
    {
      provide: RepositorioProcedimientosVeterinarios,
      useExisting: RepositorioProcedimientosVeterinariosDatos,
    },
    CasoUsoGestionarProcedimientosVeterinarios,
  ],
})
export class ModuloProcedimientosVeterinarios {}
