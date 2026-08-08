import { Injectable } from "@nestjs/common";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoListarActividad {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    pagina: number,
    limite: number,
  ) {
    return this.perfil.listarActividad(
      idUsuario,
      idOrganizacion,
      pagina,
      limite,
    );
  }
}
