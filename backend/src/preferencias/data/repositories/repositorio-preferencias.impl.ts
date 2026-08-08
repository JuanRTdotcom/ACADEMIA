import { Injectable } from "@nestjs/common";
import { RepositorioPreferencias } from "../../domain/repositories/repositorio-preferencias";
import { FuenteDatosPreferenciasPrisma } from "../datasources/preferencias-prisma.datasource";

@Injectable()
export class RepositorioPreferenciasDatos extends RepositorioPreferencias {
  constructor(private readonly fuenteDatos: FuenteDatosPreferenciasPrisma) {
    super();
  }

  obtener(...argumentos: Parameters<RepositorioPreferencias["obtener"]>) {
    return this.fuenteDatos.obtener(...argumentos);
  }

  actualizar(...argumentos: Parameters<RepositorioPreferencias["actualizar"]>) {
    return this.fuenteDatos.actualizar(...argumentos);
  }
}
