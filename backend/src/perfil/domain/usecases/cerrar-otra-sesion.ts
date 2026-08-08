import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoCerrarOtraSesion {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    idSesionActual: string,
    idSesionObjetivo: string,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.cerrarOtraSesion(
      idUsuario,
      idOrganizacion,
      idSesionActual,
      idSesionObjetivo,
      contexto,
    );
  }
}
