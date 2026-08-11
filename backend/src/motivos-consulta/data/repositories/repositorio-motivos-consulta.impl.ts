import { Injectable } from "@nestjs/common";
import { RepositorioMotivosConsulta } from "../../domain/repositories/repositorio-motivos-consulta";
import { FuenteDatosMotivosConsultaPrisma } from "../datasources/motivos-consulta-prisma.datasource";

@Injectable()
export class RepositorioMotivosConsultaDatos extends RepositorioMotivosConsulta {
  constructor(private fuente: FuenteDatosMotivosConsultaPrisma) {
    super();
  }
  listar(...args: Parameters<RepositorioMotivosConsulta["listar"]>) {
    return this.fuente.listar(...args);
  }
  crear(...args: Parameters<RepositorioMotivosConsulta["crear"]>) {
    return this.fuente.crear(...args);
  }
  actualizar(...args: Parameters<RepositorioMotivosConsulta["actualizar"]>) {
    return this.fuente.actualizar(...args);
  }
  cambiarEstado(
    ...args: Parameters<RepositorioMotivosConsulta["cambiarEstado"]>
  ) {
    return this.fuente.cambiarEstado(...args);
  }
  eliminar(...args: Parameters<RepositorioMotivosConsulta["eliminar"]>) {
    return this.fuente.eliminar(...args);
  }
}
