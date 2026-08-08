import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoModificarDocumento } from "../entities/documento-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoModificarDocumento {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarDocumento,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.modificarDocumento(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
