import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoCambiarContrasenia } from "../entities/comando-cambiar-contrasenia";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoCambiarContrasenia {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    idSesion: string,
    comando: ComandoCambiarContrasenia,
    peticion: ContextoSolicitud,
  ) {
    return this.perfil.cambiarContrasenia(
      idUsuario,
      idOrganizacion,
      idSesion,
      comando,
      peticion,
    );
  }
}
