import { Injectable } from "@nestjs/common";
import { RepositorioCatalogosSistema } from "../repositories/repositorio-catalogos-sistema";

@Injectable()
export class CasoUsoObtenerCatalogosApariencia {
  constructor(private catalogos: RepositorioCatalogosSistema) {}

  ejecutar() {
    return this.catalogos.obtenerOpcionesApariencia();
  }
}
