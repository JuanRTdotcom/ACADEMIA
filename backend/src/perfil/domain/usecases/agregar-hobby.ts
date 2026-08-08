import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoAgregarHobby } from "../entities/hobby-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoAgregarHobby {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarHobby,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.agregarHobby(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
