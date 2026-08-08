import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoAgregarTelefono } from "../entities/telefono-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoAgregarTelefono {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarTelefono,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.agregarTelefono(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
