import { Injectable } from "@nestjs/common";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoListarSesiones {
  constructor(private readonly perfil: RepositorioPerfil) {}

  ejecutar(idUsuario: string, idOrganizacion: string, idSesionActual: string) {
    return this.perfil.listarSesiones(
      idUsuario,
      idOrganizacion,
      idSesionActual,
    );
  }
}
