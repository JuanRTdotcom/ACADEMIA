import { Injectable } from "@nestjs/common";
import { RepositorioInquilinos } from "../../domain/repositories/repositorio-inquilinos";
import { FuenteDatosInquilinosPrisma } from "../datasources/inquilinos-prisma.datasource";

@Injectable()
export class RepositorioInquilinosDatos extends RepositorioInquilinos {
  constructor(private readonly fuenteDatos: FuenteDatosInquilinosPrisma) {
    super();
  }

  actual(...argumentos: Parameters<RepositorioInquilinos["actual"]>) {
    return this.fuenteDatos.actual(...argumentos);
  }
  leerMedio(...argumentos: Parameters<RepositorioInquilinos["leerMedio"]>) {
    return this.fuenteDatos.leerMedio(...argumentos);
  }
}
