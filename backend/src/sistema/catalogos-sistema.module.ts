import { Module } from "@nestjs/common";
import { ControladorCatalogosSistema } from "./presentation/controllers/catalogos-sistema.controller";
import { FuenteDatosCatalogosSistemaPrisma } from "./data/datasources/catalogos-sistema-prisma.datasource";
import { RepositorioCatalogosSistema } from "./domain/repositories/repositorio-catalogos-sistema";
import { CasoUsoObtenerCatalogosApariencia } from "./domain/usecases/obtener-catalogos-apariencia";
import { RepositorioCatalogosSistemaDatos } from "./data/repositories/repositorio-catalogos-sistema.impl";

@Module({
  controllers: [ControladorCatalogosSistema],
  providers: [
    FuenteDatosCatalogosSistemaPrisma,
    RepositorioCatalogosSistemaDatos,
    {
      provide: RepositorioCatalogosSistema,
      useExisting: RepositorioCatalogosSistemaDatos,
    },
    CasoUsoObtenerCatalogosApariencia,
  ],
})
export class ModuloCatalogosSistema {}
