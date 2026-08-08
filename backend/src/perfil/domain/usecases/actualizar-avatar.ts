import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ArchivoAvatarEntrada } from "../entities/avatar-perfil";
import { RepositorioPerfil } from "../repositories/repositorio-perfil";

@Injectable()
export class CasoUsoActualizarAvatar {
  constructor(private perfil: RepositorioPerfil) {}

  ejecutar(
    idUsuario: string,
    idOrganizacion: string,
    archivo: ArchivoAvatarEntrada,
    peticion: ContextoSolicitud,
  ) {
    return this.perfil.actualizarAvatar(
      idUsuario,
      idOrganizacion,
      archivo,
      peticion,
    );
  }
}
