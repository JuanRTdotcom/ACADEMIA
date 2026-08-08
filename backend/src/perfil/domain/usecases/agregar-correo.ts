import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoAgregarCorreo } from "../entities/correo-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoAgregarCorreo {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarCorreo,
    peticion: ContextoSolicitud,
  ) {
    return this.perfil.agregarCorreo(
      idUsuario,
      idOrganizacion,
      comando,
      peticion,
    );
  }
}
