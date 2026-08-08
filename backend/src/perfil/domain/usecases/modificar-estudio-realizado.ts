import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoModificarEstudioRealizado } from "../entities/estudio-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";
@Injectable()
export class CasoUsoModificarEstudioRealizado {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarEstudioRealizado,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.modificarEstudioRealizado(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
