import { Injectable } from "@nestjs/common";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

@Injectable()
export class CasoUsoObtenerResumenEmpresa {
  constructor(private empresas: RepositorioEmpresas) {}

  ejecutar(idOrganizacion: string, idOrganizacionActual: string) {
    return this.empresas.obtenerResumen(idOrganizacion, idOrganizacionActual);
  }
}
