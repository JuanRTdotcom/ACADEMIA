import { Injectable, NotFoundException } from "@nestjs/common";
import { RepositorioPaises } from "../repositories/repositorio-paises";

@Injectable()
export class CasoUsoGestionarPaises {
  constructor(private paises: RepositorioPaises) {}

  listar(q?: string) {
    return this.paises.listar(q);
  }

  async cambiarEstado(id: string, activo: boolean) {
    const existente = await this.paises.obtener(id);
    if (!existente) {
      throw new NotFoundException("countries.notFound");
    }
    return this.paises.cambiarEstado(id, activo);
  }
}
