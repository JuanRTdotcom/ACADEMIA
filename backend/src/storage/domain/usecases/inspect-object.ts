import { Injectable } from "@nestjs/common";
import { validarClaveAlmacenamiento } from "../entities/storage-key";
import { RepositorioAlmacenamiento } from "../repositories/storage.repository";

/** Confirma después de una carga que el objeto y sus metadatos realmente existen. */
@Injectable()
export class CasoUsoInspeccionarObjeto {
  constructor(private almacenamiento: RepositorioAlmacenamiento) {}

  ejecutar(clave: string) {
    return this.almacenamiento.inspeccionar(validarClaveAlmacenamiento(clave));
  }
}
