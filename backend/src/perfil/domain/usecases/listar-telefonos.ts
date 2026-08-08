import { Injectable } from "@nestjs/common";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoListarTelefonos {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(idUsuario: string, idOrganizacion: string) {
    return this.perfil.listarTelefonos(idUsuario, idOrganizacion);
  }
}
