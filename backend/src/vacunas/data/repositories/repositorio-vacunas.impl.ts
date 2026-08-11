import { Injectable } from "@nestjs/common";
import { RepositorioVacunas } from "../../domain/repositories/repositorio-vacunas";
import { FuenteDatosVacunasPrisma } from "../datasources/vacunas-prisma.datasource";

@Injectable()
export class RepositorioVacunasDatos extends RepositorioVacunas {
  constructor(private fuente: FuenteDatosVacunasPrisma) {
    super();
  }
  listar(...args: Parameters<RepositorioVacunas["listar"]>) {
    return this.fuente.listar(...args);
  }
  crear(...args: Parameters<RepositorioVacunas["crear"]>) {
    return this.fuente.crear(...args);
  }
  actualizar(...args: Parameters<RepositorioVacunas["actualizar"]>) {
    return this.fuente.actualizar(...args);
  }
  cambiarEstado(...args: Parameters<RepositorioVacunas["cambiarEstado"]>) {
    return this.fuente.cambiarEstado(...args);
  }
  eliminar(...args: Parameters<RepositorioVacunas["eliminar"]>) {
    return this.fuente.eliminar(...args);
  }
}
