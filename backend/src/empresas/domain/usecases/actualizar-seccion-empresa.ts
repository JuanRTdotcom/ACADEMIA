import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  SeccionEmpresa,
  SeccionesEmpresa,
} from "../entities/seccion-empresa";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

@Injectable()
export class CasoUsoActualizarSeccionEmpresa {
  constructor(private empresas: RepositorioEmpresas) {}

  ejecutar<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
    datos: SeccionesEmpresa[S],
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.actualizarSeccion(
      idOrganizacion,
      seccion,
      datos,
      idOrganizacionActual,
      idUsuarioActual,
      contexto,
    );
  }
}
