import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoActualizarVerificacionCorreo } from "../entities/correo-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoActualizarVerificacionCorreo {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoActualizarVerificacionCorreo,
    peticion: ContextoSolicitud,
  ) {
    return this.perfil.actualizarVerificacionCorreo(
      idUsuario,
      idOrganizacion,
      comando,
      peticion,
    );
  }
}
