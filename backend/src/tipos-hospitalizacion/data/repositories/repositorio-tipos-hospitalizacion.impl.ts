import { Injectable } from "@nestjs/common";
import { RepositorioTiposHospitalizacion } from "../../domain/repositories/repositorio-tipos-hospitalizacion";
import { FuenteDatosTiposHospitalizacionPrisma } from "../datasources/tipos-hospitalizacion-prisma.datasource";

@Injectable()
export class RepositorioTiposHospitalizacionDatos extends RepositorioTiposHospitalizacion {
  constructor(private fuente: FuenteDatosTiposHospitalizacionPrisma) {
    super();
  }
  listar(...args: Parameters<RepositorioTiposHospitalizacion["listar"]>) {
    return this.fuente.listar(...args);
  }
  buscar(...args: Parameters<RepositorioTiposHospitalizacion["buscar"]>) { return this.fuente.buscar(...args); }
  crear(...args: Parameters<RepositorioTiposHospitalizacion["crear"]>) {
    return this.fuente.crear(...args);
  }
  actualizar(
    ...args: Parameters<RepositorioTiposHospitalizacion["actualizar"]>
  ) {
    return this.fuente.actualizar(...args);
  }
  cambiarEstado(
    ...args: Parameters<RepositorioTiposHospitalizacion["cambiarEstado"]>
  ) {
    return this.fuente.cambiarEstado(...args);
  }
  eliminar(...args: Parameters<RepositorioTiposHospitalizacion["eliminar"]>) {
    return this.fuente.eliminar(...args);
  }
}
