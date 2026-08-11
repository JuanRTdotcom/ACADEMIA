import { Module } from "@nestjs/common";
import { FuenteDatosPruebasLaboratorioPrisma } from "./data/datasources/pruebas-laboratorio-prisma.datasource";
import { RepositorioPruebasLaboratorioDatos } from "./data/repositories/repositorio-pruebas-laboratorio.impl";
import { RepositorioPruebasLaboratorio } from "./domain/repositories/repositorio-pruebas-laboratorio";
import { CasoUsoGestionarPruebasLaboratorio } from "./domain/usecases/gestionar-pruebas-laboratorio";
import { ControladorPruebasLaboratorio } from "./presentation/controllers/pruebas-laboratorio.controller";

@Module({
  controllers: [ControladorPruebasLaboratorio],
  providers: [
    FuenteDatosPruebasLaboratorioPrisma,
    RepositorioPruebasLaboratorioDatos,
    {
      provide: RepositorioPruebasLaboratorio,
      useExisting: RepositorioPruebasLaboratorioDatos,
    },
    CasoUsoGestionarPruebasLaboratorio,
  ],
})
export class ModuloPruebasLaboratorio {}
