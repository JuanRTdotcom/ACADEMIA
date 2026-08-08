import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoGuardarEstudioRealizado } from "../entities/estudio-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";
@Injectable()
export class CasoUsoAgregarEstudioRealizado {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoGuardarEstudioRealizado,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.agregarEstudioRealizado(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
