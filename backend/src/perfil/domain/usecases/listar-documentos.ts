import { Injectable } from "@nestjs/common";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoListarDocumentos {
  constructor(private readonly perfil: RepositorioPerfil) {}
  ejecutar(idUsuario: string, idOrganizacion: string) {
    return this.perfil.listarDocumentos(idUsuario, idOrganizacion);
  }
}
