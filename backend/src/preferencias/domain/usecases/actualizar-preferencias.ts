import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoActualizarPreferencias } from "../entities/comando-actualizar-preferencias";
import { RepositorioPreferencias } from "../repositories/repositorio-preferencias";

@Injectable()
export class CasoUsoActualizarPreferencias {
  constructor(private preferencias: RepositorioPreferencias) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoActualizarPreferencias,
    peticion: ContextoSolicitud,
  ) {
    return this.preferencias.actualizar(
      idUsuario,
      idOrganizacion,
      comando,
      peticion,
    );
  }
}
