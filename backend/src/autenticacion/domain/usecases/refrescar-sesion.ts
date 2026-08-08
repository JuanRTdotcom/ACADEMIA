import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioAutenticacion } from "../repositories/repositorio-autenticacion";

/** Punto de entrada único para rotar una sesión existente. */
@Injectable()
export class CasoUsoRefrescarSesion {
  constructor(private autenticacion: RepositorioAutenticacion) {}

  ejecutar(
    idUsuarios: string,
    idSesion: string,
    generacion: number,
    tokenRefresco: string,
    peticion: ContextoSolicitud,
  ) {
    return this.autenticacion.refrescar(
      idUsuarios,
      idSesion,
      generacion,
      tokenRefresco,
      peticion,
    );
  }
}
