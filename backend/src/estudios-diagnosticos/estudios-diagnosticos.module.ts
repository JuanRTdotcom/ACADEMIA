import { Module } from "@nestjs/common";
import { ModuloTokenOpaco } from "../comun/seguridad/token-opaco.module";
import { FuenteDatosEstudiosDiagnosticosPrisma } from "./data/datasources/estudios-diagnosticos-prisma.datasource";
import { RepositorioEstudiosDiagnosticosDatos } from "./data/repositories/repositorio-estudios-diagnosticos.impl";
import { RepositorioEstudiosDiagnosticos } from "./domain/repositories/repositorio-estudios-diagnosticos";
import { CasoUsoGestionarEstudiosDiagnosticos } from "./domain/usecases/gestionar-estudios-diagnosticos";
import { ControladorEstudiosDiagnosticos } from "./presentation/controllers/estudios-diagnosticos.controller";

@Module({ imports: [ModuloTokenOpaco], controllers: [ControladorEstudiosDiagnosticos], providers: [FuenteDatosEstudiosDiagnosticosPrisma, RepositorioEstudiosDiagnosticosDatos, { provide: RepositorioEstudiosDiagnosticos, useExisting: RepositorioEstudiosDiagnosticosDatos }, CasoUsoGestionarEstudiosDiagnosticos] })
export class ModuloEstudiosDiagnosticos {}
