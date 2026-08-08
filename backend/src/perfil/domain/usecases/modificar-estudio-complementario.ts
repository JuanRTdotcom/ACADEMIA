import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoModificarEstudioComplementario } from "../entities/estudio-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";
@Injectable()
export class CasoUsoModificarEstudioComplementario {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarEstudioComplementario,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.modificarEstudioComplementario(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
