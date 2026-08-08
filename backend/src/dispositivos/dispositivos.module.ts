import { Module } from "@nestjs/common"; // NestJS: declara un módulo
import { ControladorDispositivos } from "./presentation/controllers/dispositivos.controller";
import { FuenteDatosDispositivosPrisma } from "./data/datasources/dispositivos-prisma.datasource";
import { RepositorioDispositivos } from "./domain/repositories/repositorio-dispositivos";
import { CasoUsoRegistrarCliente } from "./domain/usecases/registrar-cliente";
import { CasoUsoRegistrarTokenPush } from "./domain/usecases/registrar-token-push";
import { RepositorioDispositivosDatos } from "./data/repositories/repositorio-dispositivos.impl";

@Module({
  controllers: [ControladorDispositivos],
  providers: [
    FuenteDatosDispositivosPrisma,
    RepositorioDispositivosDatos,
    {
      provide: RepositorioDispositivos,
      useExisting: RepositorioDispositivosDatos,
    },
    CasoUsoRegistrarCliente,
    CasoUsoRegistrarTokenPush,
  ],
})
export class ModuloDispositivos {}
