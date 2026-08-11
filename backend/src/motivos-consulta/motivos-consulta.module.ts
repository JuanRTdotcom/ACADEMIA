import { Module } from "@nestjs/common";
import { FuenteDatosMotivosConsultaPrisma } from "./data/datasources/motivos-consulta-prisma.datasource";
import { RepositorioMotivosConsultaDatos } from "./data/repositories/repositorio-motivos-consulta.impl";
import { RepositorioMotivosConsulta } from "./domain/repositories/repositorio-motivos-consulta";
import { CasoUsoGestionarMotivosConsulta } from "./domain/usecases/gestionar-motivos-consulta";
import { ControladorMotivosConsulta } from "./presentation/controllers/motivos-consulta.controller";

@Module({
  controllers: [ControladorMotivosConsulta],
  providers: [
    FuenteDatosMotivosConsultaPrisma,
    RepositorioMotivosConsultaDatos,
    {
      provide: RepositorioMotivosConsulta,
      useExisting: RepositorioMotivosConsultaDatos,
    },
    CasoUsoGestionarMotivosConsulta,
  ],
})
export class ModuloMotivosConsulta {}
