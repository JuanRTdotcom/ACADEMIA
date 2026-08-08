import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoActualizarDatosPersonales } from "../entities/datos-personales";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoActualizarDatosPersonales {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoActualizarDatosPersonales,
    peticion: ContextoSolicitud,
  ) {
    return this.perfil.actualizarDatosPersonales(
      idUsuario,
      idOrganizacion,
      comando,
      peticion,
    );
  }
}
