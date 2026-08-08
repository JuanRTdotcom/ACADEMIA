import { Module } from "@nestjs/common";
import { ControladorInquilinos } from "./presentation/controllers/inquilinos.controller";
import { FuenteDatosInquilinosPrisma } from "./data/datasources/inquilinos-prisma.datasource";
import { RepositorioInquilinos } from "./domain/repositories/repositorio-inquilinos";
import { CasoUsoObtenerInquilinoActual } from "./domain/usecases/obtener-inquilino-actual";
import { RepositorioInquilinosDatos } from "./data/repositories/repositorio-inquilinos.impl";
import { ModuloAlmacenamiento } from "../storage/storage.module";

@Module({
  imports: [ModuloAlmacenamiento],
  controllers: [ControladorInquilinos],
  providers: [
    FuenteDatosInquilinosPrisma,
    RepositorioInquilinosDatos,
    { provide: RepositorioInquilinos, useExisting: RepositorioInquilinosDatos },
    CasoUsoObtenerInquilinoActual,
  ],
})
export class ModuloInquilinos {}
