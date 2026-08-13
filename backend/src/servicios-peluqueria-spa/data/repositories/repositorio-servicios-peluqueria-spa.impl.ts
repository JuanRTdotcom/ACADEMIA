import { Injectable } from "@nestjs/common";
import { FuenteDatosServiciosPeluqueriaSpaPrisma } from "../datasources/servicios-peluqueria-spa-prisma.datasource";
import { RepositorioServiciosPeluqueriaSpa } from "../../domain/repositories/repositorio-servicios-peluqueria-spa";
@Injectable()
export class RepositorioServiciosPeluqueriaSpaDatos implements RepositorioServiciosPeluqueriaSpa {
  constructor(private fuente: FuenteDatosServiciosPeluqueriaSpaPrisma) {}
  listar(...args: Parameters<RepositorioServiciosPeluqueriaSpa["listar"]>) { return this.fuente.listar(...args); }
  buscar(...args: Parameters<RepositorioServiciosPeluqueriaSpa["buscar"]>) { return this.fuente.buscar(...args); }
  crear(...args: Parameters<RepositorioServiciosPeluqueriaSpa["crear"]>) { return this.fuente.crear(...args); }
  actualizar(...args: Parameters<RepositorioServiciosPeluqueriaSpa["actualizar"]>) { return this.fuente.actualizar(...args); }
  cambiarEstado(...args: Parameters<RepositorioServiciosPeluqueriaSpa["cambiarEstado"]>) { return this.fuente.cambiarEstado(...args); }
  eliminar(...args: Parameters<RepositorioServiciosPeluqueriaSpa["eliminar"]>) { return this.fuente.eliminar(...args); }
}
