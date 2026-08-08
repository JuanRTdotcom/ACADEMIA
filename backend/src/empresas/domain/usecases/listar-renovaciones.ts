import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

@Injectable()
export class CasoUsoListarRenovaciones {
  constructor(private empresas: RepositorioEmpresas) {}

  ejecutar(
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    q?: string,
    limit?: number,
    idOrganizacionFiltrar?: string,
  ) {
    return this.empresas.listarRenovaciones(
      idOrganizacionActual,
      idUsuarioActual,
      contexto,
      q,
      limit,
      idOrganizacionFiltrar,
    );
  }
}
