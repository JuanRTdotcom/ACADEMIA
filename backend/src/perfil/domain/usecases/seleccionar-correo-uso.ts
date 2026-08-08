import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoSeleccionarCorreoUso } from "../entities/correo-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoSeleccionarCorreoUso {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoSeleccionarCorreoUso,
    peticion: ContextoSolicitud,
  ) {
    return this.perfil.seleccionarCorreoUso(
      idUsuario,
      idOrganizacion,
      comando,
      peticion,
    );
  }
}
