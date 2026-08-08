import { Injectable } from "@nestjs/common";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoListarNacionalidades {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(idUsuario: string, idOrganizacion: string) {
    return this.perfil.listarNacionalidades(idUsuario, idOrganizacion);
  }
}
