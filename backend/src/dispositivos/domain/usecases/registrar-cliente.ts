import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoRegistrarCliente } from "../entities/comando-registrar-cliente";
import { RepositorioDispositivos } from "../repositories/repositorio-dispositivos";

@Injectable()
export class CasoUsoRegistrarCliente {
  constructor(private dispositivos: RepositorioDispositivos) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoRegistrarCliente,
    peticion: ContextoSolicitud,
  ) {
    return this.dispositivos.registrarCliente(
      idUsuario,
      idOrganizacion,
      comando,
      peticion,
    );
  }
}
