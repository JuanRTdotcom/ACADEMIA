import { Injectable } from "@nestjs/common";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoListarEstudios {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(idUsuario: string, idOrganizacion: string) {
    return this.perfil.listarEstudios(idUsuario, idOrganizacion);
  }
}
