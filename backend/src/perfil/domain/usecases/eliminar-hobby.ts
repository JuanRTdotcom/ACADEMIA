import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoEliminarHobby } from "../entities/hobby-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoEliminarHobby {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarHobby,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.eliminarHobby(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
