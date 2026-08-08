import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

/** Activa (reactiva) o desactiva (baja lógica) una empresa. */
@Injectable()
export class CasoUsoCambiarEstadoEmpresa {
  constructor(private empresas: RepositorioEmpresas) {}

  ejecutar(
    idOrganizacion: string,
    activo: boolean,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.cambiarEstado(
      idOrganizacion,
      activo,
      idOrganizacionActual,
      idUsuarioActual,
      contexto,
    );
  }
}
