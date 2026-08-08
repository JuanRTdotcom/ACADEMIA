import { Module } from "@nestjs/common";
import { ControladorPreferencias } from "./presentation/controllers/preferencias.controller";
import { FuenteDatosPreferenciasPrisma } from "./data/datasources/preferencias-prisma.datasource";
import { RepositorioPreferencias } from "./domain/repositories/repositorio-preferencias";
import { CasoUsoObtenerPreferencias } from "./domain/usecases/obtener-preferencias";
import { CasoUsoActualizarPreferencias } from "./domain/usecases/actualizar-preferencias";
import { RepositorioPreferenciasDatos } from "./data/repositories/repositorio-preferencias.impl";

@Module({
  controllers: [ControladorPreferencias],
  providers: [
    FuenteDatosPreferenciasPrisma,
    RepositorioPreferenciasDatos,
    {
      provide: RepositorioPreferencias,
      useExisting: RepositorioPreferenciasDatos,
    },
    CasoUsoObtenerPreferencias,
    CasoUsoActualizarPreferencias,
  ],
})
export class ModuloPreferencias {}
