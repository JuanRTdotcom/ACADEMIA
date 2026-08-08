import { Injectable } from "@nestjs/common";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

@Injectable()
export class CasoUsoObtenerEmpresa {
  constructor(private empresas: RepositorioEmpresas) {}

  ejecutar(idOrganizacion: string, idOrganizacionActual: string) {
    return this.empresas.obtener(idOrganizacion, idOrganizacionActual);
  }
}
