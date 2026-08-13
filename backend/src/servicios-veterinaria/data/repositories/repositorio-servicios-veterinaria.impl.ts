import { Injectable } from "@nestjs/common";
import { FuenteDatosServiciosVeterinariaPrisma } from "../datasources/servicios-veterinaria-prisma.datasource";
import { RepositorioServiciosVeterinaria } from "../../domain/repositories/repositorio-servicios-veterinaria";

@Injectable()
export class RepositorioServiciosVeterinariaDatos extends RepositorioServiciosVeterinaria {
  constructor(private fuente: FuenteDatosServiciosVeterinariaPrisma) {
    super();
  }

  listar(...args: Parameters<RepositorioServiciosVeterinaria["listar"]>) {
    return this.fuente.listar(...args);
  }
  buscar(...args: Parameters<RepositorioServiciosVeterinaria["buscar"]>) {
    return this.fuente.buscar(...args);
  }
  obtener(...args: Parameters<RepositorioServiciosVeterinaria["obtener"]>) {
    return this.fuente.obtener(...args);
  }
  crear(...args: Parameters<RepositorioServiciosVeterinaria["crear"]>) {
    return this.fuente.crear(...args);
  }
  actualizar(
    ...args: Parameters<RepositorioServiciosVeterinaria["actualizar"]>
  ) {
    return this.fuente.actualizar(...args);
  }
  cambiarEstado(
    ...args: Parameters<RepositorioServiciosVeterinaria["cambiarEstado"]>
  ) {
    return this.fuente.cambiarEstado(...args);
  }
  eliminar(...args: Parameters<RepositorioServiciosVeterinaria["eliminar"]>) {
    return this.fuente.eliminar(...args);
  }
}
