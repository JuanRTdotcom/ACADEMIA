import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoEliminarAvatar {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    peticion: ContextoSolicitud,
  ) {
    return this.perfil.eliminarAvatar(idUsuario, idOrganizacion, peticion);
  }
}
