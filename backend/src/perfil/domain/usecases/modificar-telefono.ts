import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoModificarTelefono } from "../entities/telefono-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoModificarTelefono {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarTelefono,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.modificarTelefono(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
