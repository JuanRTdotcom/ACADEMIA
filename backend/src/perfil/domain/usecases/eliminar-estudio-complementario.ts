import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";
@Injectable()
export class CasoUsoEliminarEstudioComplementario {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    id: string,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.eliminarEstudioComplementario(
      idUsuario,
      idOrganizacion,
      id,
      contexto,
    );
  }
}
