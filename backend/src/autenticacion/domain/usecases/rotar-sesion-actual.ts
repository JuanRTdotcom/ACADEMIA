import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioAutenticacion } from "../repositories/repositorio-autenticacion";

/** Rota ambos tokens después de una reautenticación sensible. */
@Injectable()
export class CasoUsoRotarSesionActual {
  constructor(private autenticacion: RepositorioAutenticacion) {}

  ejecutar(
    idUsuario: string,
    idSesion: string,
    tokenRefresco: string,
    peticion: ContextoSolicitud,
  ) {
    return this.autenticacion.rotarSesionActual(
      idUsuario,
      idSesion,
      tokenRefresco,
      peticion,
    );
  }
}
