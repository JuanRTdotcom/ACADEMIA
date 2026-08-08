import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

@Injectable()
export class CasoUsoEliminarEmpresa {
  constructor(private empresas: RepositorioEmpresas) {}

  ejecutar(
    organizacion: string,
    organizacionActual: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.eliminar(
      organizacion,
      organizacionActual,
      usuario,
      contexto,
    );
  }
}
