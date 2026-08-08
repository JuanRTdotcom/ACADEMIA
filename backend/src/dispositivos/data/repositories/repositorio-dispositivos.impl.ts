import { Injectable } from "@nestjs/common";
import { RepositorioDispositivos } from "../../domain/repositories/repositorio-dispositivos";
import { FuenteDatosDispositivosPrisma } from "../datasources/dispositivos-prisma.datasource";

@Injectable()
export class RepositorioDispositivosDatos extends RepositorioDispositivos {
  constructor(private readonly fuenteDatos: FuenteDatosDispositivosPrisma) {
    super();
  }

  registrarCliente(
    ...argumentos: Parameters<RepositorioDispositivos["registrarCliente"]>
  ) {
    return this.fuenteDatos.registrarCliente(...argumentos);
  }

  registrarTokenPush(
    ...argumentos: Parameters<RepositorioDispositivos["registrarTokenPush"]>
  ) {
    return this.fuenteDatos.registrarTokenPush(...argumentos);
  }
}
