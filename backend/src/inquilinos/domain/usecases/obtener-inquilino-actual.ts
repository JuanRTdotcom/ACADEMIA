import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioInquilinos } from "../repositories/repositorio-inquilinos";

@Injectable()
export class CasoUsoObtenerInquilinoActual {
  constructor(private inquilinos: RepositorioInquilinos) {}

  ejecutar(peticion: ContextoSolicitud) {
    return this.inquilinos.actual(peticion);
  }

  leerMedio(
    peticion: ContextoSolicitud,
    tipo:
      | "escudo"
      | "escudo_oscuro"
      | "imagotipo"
      | "imagotipo_oscuro"
      | "portada"
      | "login_escudo"
      | "login_escudo_oscuro",
    version: string,
  ) {
    return this.inquilinos.leerMedio(peticion, tipo, version);
  }
}
