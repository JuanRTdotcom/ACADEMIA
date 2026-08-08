import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoEliminarDocumento } from "../entities/documento-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoEliminarDocumento {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarDocumento,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.eliminarDocumento(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
