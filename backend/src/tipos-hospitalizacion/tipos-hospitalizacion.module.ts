import { Module } from "@nestjs/common";
import { FuenteDatosTiposHospitalizacionPrisma } from "./data/datasources/tipos-hospitalizacion-prisma.datasource";
import { RepositorioTiposHospitalizacionDatos } from "./data/repositories/repositorio-tipos-hospitalizacion.impl";
import { RepositorioTiposHospitalizacion } from "./domain/repositories/repositorio-tipos-hospitalizacion";
import { CasoUsoGestionarTiposHospitalizacion } from "./domain/usecases/gestionar-tipos-hospitalizacion";
import { ControladorTiposHospitalizacion } from "./presentation/controllers/tipos-hospitalizacion.controller";

@Module({
  controllers: [ControladorTiposHospitalizacion],
  providers: [
    FuenteDatosTiposHospitalizacionPrisma,
    RepositorioTiposHospitalizacionDatos,
    {
      provide: RepositorioTiposHospitalizacion,
      useExisting: RepositorioTiposHospitalizacionDatos,
    },
    CasoUsoGestionarTiposHospitalizacion,
  ],
})
export class ModuloTiposHospitalizacion {}
