import { Injectable } from "@nestjs/common";
import { FuenteDatosPropietariosPrisma } from "../datasources/propietarios-prisma.datasource";
import { RepositorioPropietarios } from "../../domain/repositories/repositorio-propietarios";

@Injectable()
export class RepositorioPropietariosDatos extends RepositorioPropietarios {
  constructor(private fuente: FuenteDatosPropietariosPrisma) {
    super();
  }
  listar(...args: Parameters<RepositorioPropietarios["listar"]>) {
    return this.fuente.listar(...args);
  }
  opciones(...args: Parameters<RepositorioPropietarios["opciones"]>) {
    return this.fuente.opciones(...args);
  }
  obtener(...args: Parameters<RepositorioPropietarios["obtener"]>) {
    return this.fuente.obtener(...args);
  }
  crear(...args: Parameters<RepositorioPropietarios["crear"]>) {
    return this.fuente.crear(...args);
  }
  actualizar(...args: Parameters<RepositorioPropietarios["actualizar"]>) {
    return this.fuente.actualizar(...args);
  }
  eliminar(...args: Parameters<RepositorioPropietarios["eliminar"]>) {
    return this.fuente.eliminar(...args);
  }
}
