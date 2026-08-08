import { Injectable } from "@nestjs/common";
import {
  normalizarNombreDescarga,
  validarClaveAlmacenamiento,
} from "../entities/storage-key";
import { RepositorioAlmacenamiento } from "../repositories/storage.repository";

/** Genera un GET temporal para un objeto previamente autorizado por el consumidor. */
@Injectable()
export class CasoUsoCrearDescargaFirmada {
  constructor(private almacenamiento: RepositorioAlmacenamiento) {}

  ejecutar(clave: string, nombreDescarga?: string) {
    validarClaveAlmacenamiento(clave);
    return this.almacenamiento.crearDescargaFirmada(
      clave,
      nombreDescarga ? normalizarNombreDescarga(nombreDescarga) : undefined,
    );
  }
}
