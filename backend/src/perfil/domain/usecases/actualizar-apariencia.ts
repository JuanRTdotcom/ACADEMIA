import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoActualizarApariencia } from "../entities/comando-actualizar-apariencia";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoActualizarApariencia {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoActualizarApariencia,
    peticion: ContextoSolicitud,
  ) {
    return this.perfil.actualizarApariencia(
      idUsuario,
      idOrganizacion,
      comando,
      peticion,
    );
  }
}
