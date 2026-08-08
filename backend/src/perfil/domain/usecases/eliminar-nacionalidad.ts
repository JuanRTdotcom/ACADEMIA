import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoEliminarNacionalidad } from "../entities/nacionalidad-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoEliminarNacionalidad {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarNacionalidad,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.eliminarNacionalidad(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
