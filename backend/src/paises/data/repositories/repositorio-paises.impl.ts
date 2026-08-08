import { Injectable } from "@nestjs/common";
import { RepositorioPaises } from "../../domain/repositories/repositorio-paises";
import { FuenteDatosPaisesPrisma } from "../datasources/paises-prisma.datasource";

@Injectable()
export class RepositorioPaisesDatos implements RepositorioPaises {
  constructor(private datasource: FuenteDatosPaisesPrisma) {}

  listar(q?: string): Promise<any[]> {
    return this.datasource.listar(q);
  }

  cambiarEstado(id: string, activo: boolean): Promise<any> {
    return this.datasource.cambiarEstado(id, activo);
  }

  obtener(id: string): Promise<any | null> {
    return this.datasource.obtener(id);
  }
}
