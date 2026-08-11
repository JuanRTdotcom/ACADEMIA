import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoCerrarOtrasSesiones {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    idSesionActual: string,
    contexto: ContextoSolicitud,
  ) {
    return this.perfil.cerrarOtrasSesiones(
      idUsuario,
      idOrganizacion,
      idSesionActual,
      contexto,
    );
  }
}
