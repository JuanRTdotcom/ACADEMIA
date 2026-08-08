import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoModificarCorreo } from "../entities/correo-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoModificarCorreo {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarCorreo,
    peticion: ContextoSolicitud,
  ) {
    return this.perfil.modificarCorreo(
      idUsuario,
      idOrganizacion,
      comando,
      peticion,
    );
  }
}
