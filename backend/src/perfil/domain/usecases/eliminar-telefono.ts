import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoEliminarTelefono } from "../entities/telefono-persona";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoEliminarTelefono {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarTelefono,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.eliminarTelefono(
      idUsuario,
      idOrganizacion,
      comando,
      contexto,
    );
  }
}
