import { Injectable } from "@nestjs/common";
import { RepositorioPruebasLaboratorio } from "../../domain/repositories/repositorio-pruebas-laboratorio";
import { FuenteDatosPruebasLaboratorioPrisma } from "../datasources/pruebas-laboratorio-prisma.datasource";

@Injectable()
export class RepositorioPruebasLaboratorioDatos extends RepositorioPruebasLaboratorio {
  constructor(private fuente: FuenteDatosPruebasLaboratorioPrisma) {
    super();
  }
  listar(...args: Parameters<RepositorioPruebasLaboratorio["listar"]>) {
    return this.fuente.listar(...args);
  }
  buscar(...args: Parameters<RepositorioPruebasLaboratorio["buscar"]>) { return this.fuente.buscar(...args); }
  crear(...args: Parameters<RepositorioPruebasLaboratorio["crear"]>) {
    return this.fuente.crear(...args);
  }
  actualizar(...args: Parameters<RepositorioPruebasLaboratorio["actualizar"]>) {
    return this.fuente.actualizar(...args);
  }
  cambiarEstado(
    ...args: Parameters<RepositorioPruebasLaboratorio["cambiarEstado"]>
  ) {
    return this.fuente.cambiarEstado(...args);
  }
  eliminar(...args: Parameters<RepositorioPruebasLaboratorio["eliminar"]>) {
    return this.fuente.eliminar(...args);
  }
}
