import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";
import type { DatosCrearEmpresa } from "../entities/empresa";

@Injectable()
export class CasoUsoCrearEmpresa {
  constructor(private empresas: RepositorioEmpresas) {}

  ejecutar(
    datos: DatosCrearEmpresa,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    zonaHoraria: string,
  ) {
    return this.empresas.crear(
      datos,
      idOrganizacionActual,
      idUsuarioActual,
      contexto,
      zonaHoraria,
    );
  }
}
