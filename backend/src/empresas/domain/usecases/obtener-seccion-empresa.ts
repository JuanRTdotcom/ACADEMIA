import { Injectable } from "@nestjs/common";
import type {
  SeccionEmpresa,
  SeccionesEmpresa,
} from "../entities/seccion-empresa";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

@Injectable()
export class CasoUsoObtenerSeccionEmpresa {
  constructor(private empresas: RepositorioEmpresas) {}

  ejecutar<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
    idOrganizacionActual: string,
  ): Promise<SeccionesEmpresa[S]> {
    return this.empresas.obtenerSeccion(
      idOrganizacion,
      seccion,
      idOrganizacionActual,
    );
  }
}
