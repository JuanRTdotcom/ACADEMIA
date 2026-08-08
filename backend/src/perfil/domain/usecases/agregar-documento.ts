import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoAgregarDocumento } from "../entities/documento-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoAgregarDocumento {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarDocumento,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.agregarDocumento(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
