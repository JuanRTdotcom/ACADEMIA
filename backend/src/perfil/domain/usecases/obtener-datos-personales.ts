import { Injectable } from "@nestjs/common";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoObtenerDatosPersonales {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(idUsuario: string, idOrganizacion: string) {
    return this.perfil.obtenerDatosPersonales(idUsuario, idOrganizacion);
  }
}
