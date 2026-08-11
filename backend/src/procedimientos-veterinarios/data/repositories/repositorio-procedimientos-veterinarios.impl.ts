import { Injectable } from "@nestjs/common";
import { RepositorioProcedimientosVeterinarios } from "../../domain/repositories/repositorio-procedimientos-veterinarios";
import { FuenteDatosProcedimientosVeterinariosPrisma } from "../datasources/procedimientos-veterinarios-prisma.datasource";

@Injectable()
export class RepositorioProcedimientosVeterinariosDatos extends RepositorioProcedimientosVeterinarios {
  constructor(private fuente: FuenteDatosProcedimientosVeterinariosPrisma) {
    super();
  }
  listar(...args: Parameters<RepositorioProcedimientosVeterinarios["listar"]>) {
    return this.fuente.listar(...args);
  }
  crear(...args: Parameters<RepositorioProcedimientosVeterinarios["crear"]>) {
    return this.fuente.crear(...args);
  }
  actualizar(
    ...args: Parameters<RepositorioProcedimientosVeterinarios["actualizar"]>
  ) {
    return this.fuente.actualizar(...args);
  }
  cambiarEstado(
    ...args: Parameters<RepositorioProcedimientosVeterinarios["cambiarEstado"]>
  ) {
    return this.fuente.cambiarEstado(...args);
  }
  eliminar(...args: Parameters<RepositorioProcedimientosVeterinarios["eliminar"]>) {
    return this.fuente.eliminar(...args);
  }
}
