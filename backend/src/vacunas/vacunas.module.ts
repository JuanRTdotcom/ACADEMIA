import { Module } from "@nestjs/common";
import { FuenteDatosVacunasPrisma } from "./data/datasources/vacunas-prisma.datasource";
import { RepositorioVacunasDatos } from "./data/repositories/repositorio-vacunas.impl";
import { RepositorioVacunas } from "./domain/repositories/repositorio-vacunas";
import { CasoUsoGestionarVacunas } from "./domain/usecases/gestionar-vacunas";
import { ControladorVacunas } from "./presentation/controllers/vacunas.controller";

@Module({
  controllers: [ControladorVacunas],
  providers: [
    FuenteDatosVacunasPrisma,
    RepositorioVacunasDatos,
    { provide: RepositorioVacunas, useExisting: RepositorioVacunasDatos },
    CasoUsoGestionarVacunas,
  ],
})
export class ModuloVacunas {}
