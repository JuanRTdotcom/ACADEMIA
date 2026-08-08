import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoAgregarNacionalidad } from "../entities/nacionalidad-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoAgregarNacionalidad {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarNacionalidad,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.agregarNacionalidad(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
