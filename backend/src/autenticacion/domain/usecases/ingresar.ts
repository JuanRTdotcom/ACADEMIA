import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoIngreso } from "../entities/comando-ingreso";
import { RepositorioAutenticacion } from "../repositories/repositorio-autenticacion";

/** Punto de entrada único del caso de uso de login. */
@Injectable()
export class CasoUsoIngresar {
  constructor(private autenticacion: RepositorioAutenticacion) {}

  ejecutar(comando: ComandoIngreso, peticion: ContextoSolicitud) {
    return this.autenticacion.ingresar(comando, peticion);
  }
}
