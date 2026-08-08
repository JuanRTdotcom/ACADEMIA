import { Injectable } from "@nestjs/common";
import { validarClaveAlmacenamiento } from "../entities/storage-key";
import { RepositorioAlmacenamiento } from "../repositories/storage.repository";

/** Lee contenido pequeño para procesamiento o proxy seguro desde el backend. */
@Injectable()
export class CasoUsoLeerObjeto {
  constructor(private almacenamiento: RepositorioAlmacenamiento) {}

  ejecutar(clave: string) {
    return this.almacenamiento.leer(validarClaveAlmacenamiento(clave));
  }
}
