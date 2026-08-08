import { Injectable } from "@nestjs/common";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoObtenerAvatar {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(idUsuario: string, idOrganizacion: string) {
    return this.perfil.obtenerAvatar(idUsuario, idOrganizacion);
  }
}
