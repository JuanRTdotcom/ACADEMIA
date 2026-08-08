import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoModificarSeguro } from "../entities/seguro-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoModificarSeguro {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarSeguro,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.modificarSeguro(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
