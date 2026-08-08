import { Injectable } from "@nestjs/common";
import { RepositorioCatalogosSistema } from "../../domain/repositories/repositorio-catalogos-sistema";
import { FuenteDatosCatalogosSistemaPrisma } from "../datasources/catalogos-sistema-prisma.datasource";

@Injectable()
export class RepositorioCatalogosSistemaDatos extends RepositorioCatalogosSistema {
  constructor(private readonly fuenteDatos: FuenteDatosCatalogosSistemaPrisma) {
    super();
  }

  obtenerOpcionesApariencia(
    ...argumentos: Parameters<
      RepositorioCatalogosSistema["obtenerOpcionesApariencia"]
    >
  ) {
    return this.fuenteDatos.obtenerOpcionesApariencia(...argumentos);
  }
}
