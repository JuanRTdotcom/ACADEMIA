import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioAutenticacion } from "../repositories/repositorio-autenticacion";

/** Punto de entrada único para cerrar la sesión actual. */
@Injectable()
export class CasoUsoCerrarSesion {
  constructor(private autenticacion: RepositorioAutenticacion) {}

  ejecutar(idSesion: string, peticion: ContextoSolicitud) {
    return this.autenticacion.cerrarSesion(idSesion, peticion);
  }
}
