import { Controller, Get } from "@nestjs/common";
import { CasoUsoObtenerCatalogosApariencia } from "../../domain/usecases/obtener-catalogos-apariencia";

/** Catálogos globales protegidos por la sesión y compartidos entre tenants. */
@Controller("system/catalogs")
export class ControladorCatalogosSistema {
  constructor(private obtenerCatalogos: CasoUsoObtenerCatalogosApariencia) {}

  @Get("appearance")
  obtenerOpcionesApariencia() {
    return this.obtenerCatalogos.ejecutar();
  }
}
