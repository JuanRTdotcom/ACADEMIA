import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoEliminarCorreo } from "../entities/correo-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoEliminarCorreo {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarCorreo,
    peticion: ContextoSolicitud,
  ) {
    return this.perfil.eliminarCorreo(
      idUsuario,
      idOrganizacion,
      comando,
      peticion,
    );
  }
}
