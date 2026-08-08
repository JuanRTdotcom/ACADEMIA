import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoAgregarSeguro } from "../entities/seguro-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoAgregarSeguro {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarSeguro,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.agregarSeguro(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
