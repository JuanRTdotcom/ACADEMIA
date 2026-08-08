import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosCrearEmpresa } from "../entities/empresa";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

@Injectable()
export class CasoUsoActualizarEmpresa {
  constructor(private empresas: RepositorioEmpresas) {}

  ejecutar(
    idOrganizacion: string,
    datos: DatosCrearEmpresa,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    zonaHoraria: string,
  ) {
    return this.empresas.actualizar(
      idOrganizacion,
      datos,
      idOrganizacionActual,
      idUsuarioActual,
      contexto,
      zonaHoraria,
    );
  }
}
