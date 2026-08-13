import { Module } from "@nestjs/common";
import { ModuloTokenOpaco } from "../comun/seguridad/token-opaco.module";
import { FuenteDatosServiciosPeluqueriaSpaPrisma } from "./data/datasources/servicios-peluqueria-spa-prisma.datasource";
import { RepositorioServiciosPeluqueriaSpaDatos } from "./data/repositories/repositorio-servicios-peluqueria-spa.impl";
import { RepositorioServiciosPeluqueriaSpa } from "./domain/repositories/repositorio-servicios-peluqueria-spa";
import { CasoUsoGestionarServiciosPeluqueriaSpa } from "./domain/usecases/gestionar-servicios-peluqueria-spa";
import { ControladorServiciosPeluqueriaSpa } from "./presentation/controllers/servicios-peluqueria-spa.controller";
@Module({ imports: [ModuloTokenOpaco], controllers: [ControladorServiciosPeluqueriaSpa], providers: [FuenteDatosServiciosPeluqueriaSpaPrisma, RepositorioServiciosPeluqueriaSpaDatos, { provide: RepositorioServiciosPeluqueriaSpa, useExisting: RepositorioServiciosPeluqueriaSpaDatos }, CasoUsoGestionarServiciosPeluqueriaSpa] })
export class ModuloServiciosPeluqueriaSpa {}
