import { Injectable } from "@nestjs/common";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoListarSeguros {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(idUsuario: string, idOrganizacion: string) {
    return this.perfil.listarSeguros(idUsuario, idOrganizacion);
  }
}
