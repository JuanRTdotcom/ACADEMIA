import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoActualizarSegundoFactor } from "../entities/comando-actualizar-segundo-factor";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoActualizarSegundoFactor {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoActualizarSegundoFactor,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.actualizarSegundoFactor(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
