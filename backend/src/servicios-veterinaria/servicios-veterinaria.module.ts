import { Module } from "@nestjs/common";
import { FuenteDatosServiciosVeterinariaPrisma } from "./data/datasources/servicios-veterinaria-prisma.datasource";
import { RepositorioServiciosVeterinariaDatos } from "./data/repositories/repositorio-servicios-veterinaria.impl";
import { RepositorioServiciosVeterinaria } from "./domain/repositories/repositorio-servicios-veterinaria";
import { CasoUsoGestionarServiciosVeterinaria } from "./domain/usecases/gestionar-servicios-veterinaria";
import { ControladorServiciosVeterinaria } from "./presentation/controllers/servicios-veterinaria.controller";

@Module({
  controllers: [ControladorServiciosVeterinaria],
  providers: [
    FuenteDatosServiciosVeterinariaPrisma,
    RepositorioServiciosVeterinariaDatos,
    {
      provide: RepositorioServiciosVeterinaria,
      useExisting: RepositorioServiciosVeterinariaDatos,
    },
    CasoUsoGestionarServiciosVeterinaria,
  ],
})
export class ModuloServiciosVeterinaria {}
