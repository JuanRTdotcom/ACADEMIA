import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";
@Injectable()
export class CasoUsoEliminarEstudioRealizado {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    id: string,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.eliminarEstudioRealizado(
      idUsuario,
      idOrganizacion,
      id,
      contexto,
    );
  }
}
