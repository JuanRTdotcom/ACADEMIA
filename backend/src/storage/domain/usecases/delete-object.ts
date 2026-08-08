import { Injectable } from "@nestjs/common";
import { validarClaveAlmacenamiento } from "../entities/storage-key";
import { RepositorioAlmacenamiento } from "../repositories/storage.repository";

/** Elimina el binario; la transacción de metadatos pertenece al módulo consumidor. */
@Injectable()
export class CasoUsoEliminarObjeto {
  constructor(private almacenamiento: RepositorioAlmacenamiento) {}

  ejecutar(clave: string) {
    return this.almacenamiento.eliminar(validarClaveAlmacenamiento(clave));
  }
}
