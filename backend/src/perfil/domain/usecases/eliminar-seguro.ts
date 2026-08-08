import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoEliminarSeguro } from "../entities/seguro-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoEliminarSeguro {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarSeguro,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.eliminarSeguro(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
