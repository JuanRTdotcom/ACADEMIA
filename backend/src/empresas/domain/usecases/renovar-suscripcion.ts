import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

@Injectable()
export class CasoUsoRenovarSuscripcion {
  constructor(private empresas: RepositorioEmpresas) {}

  ejecutar(
    idOrganizacion: string,
    datos: {
      fid_planes: string;
      fecha_inicio: Date;
      fecha_fin: Date;
      monto?: number;
      metodo_pago?: string;
    },
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.renovar(
      idOrganizacion,
      datos,
      idOrganizacionActual,
      idUsuarioActual,
      contexto,
    );
  }
}
