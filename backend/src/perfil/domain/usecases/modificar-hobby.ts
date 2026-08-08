import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoModificarHobby } from "../entities/hobby-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoModificarHobby {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarHobby,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.modificarHobby(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
