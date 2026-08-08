import { Injectable } from "@nestjs/common";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

@Injectable()
export class CasoUsoListarEmpresas {
  constructor(private empresas: RepositorioEmpresas) {}

  ejecutar(idOrganizacionActual: string, busqueda?: string) {
    return this.empresas.listar(idOrganizacionActual, busqueda);
  }
}
