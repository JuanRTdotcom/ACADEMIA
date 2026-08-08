import { Injectable } from "@nestjs/common";
import { RepositorioPreferencias } from "../repositories/repositorio-preferencias";

@Injectable()
export class CasoUsoObtenerPreferencias {
  constructor(private preferencias: RepositorioPreferencias) {}

  ejecutar(idUsuario: string) {
    return this.preferencias.obtener(idUsuario);
  }
}
