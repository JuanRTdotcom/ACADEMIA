import { Injectable } from "@nestjs/common";
import type {
  SolicitudCargaFirmada,
  SolicitudGuardarObjeto,
} from "../../domain/entities/storage-object";
import { RepositorioAlmacenamiento } from "../../domain/repositories/storage.repository";
import { FuenteDatosAlmacenamientoR2 } from "../datasources/r2-storage.datasource";

/** Implementación intercambiable del contrato de almacenamiento. */
@Injectable()
export class RepositorioAlmacenamientoDatos implements RepositorioAlmacenamiento {
  constructor(private r2: FuenteDatosAlmacenamientoR2) {}

  crearCargaFirmada(solicitud: SolicitudCargaFirmada) {
    return this.r2.crearCargaFirmada(solicitud);
  }

  crearDescargaFirmada(clave: string, nombreDescarga?: string) {
    return this.r2.crearDescargaFirmada(clave, nombreDescarga);
  }

  guardar(solicitud: SolicitudGuardarObjeto) {
    return this.r2.guardar(solicitud);
  }

  leer(clave: string) {
    return this.r2.leer(clave);
  }

  inspeccionar(clave: string) {
    return this.r2.inspeccionar(clave);
  }

  eliminar(clave: string) {
    return this.r2.eliminar(clave);
  }
}
