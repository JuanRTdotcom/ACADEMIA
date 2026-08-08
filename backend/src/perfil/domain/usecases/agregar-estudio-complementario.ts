import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoGuardarEstudioComplementario } from "../entities/estudio-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";
@Injectable()
export class CasoUsoAgregarEstudioComplementario {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoGuardarEstudioComplementario,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.agregarEstudioComplementario(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
