import { Module } from "@nestjs/common";
import { FuenteDatosPaisesPrisma } from "./data/datasources/paises-prisma.datasource";
import { RepositorioPaisesDatos } from "./data/repositories/repositorio-paises.impl";
import { RepositorioPaises } from "./domain/repositories/repositorio-paises";
import { CasoUsoGestionarPaises } from "./domain/usecases/gestionar-paises";
import { ControladorPaises } from "./presentation/controllers/paises.controller";

@Module({
  controllers: [ControladorPaises],
  providers: [
    FuenteDatosPaisesPrisma,
    RepositorioPaisesDatos,
    { provide: RepositorioPaises, useExisting: RepositorioPaisesDatos },
    CasoUsoGestionarPaises,
  ],
})
export class ModuloPaises {}
