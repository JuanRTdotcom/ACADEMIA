import { BadRequestException, Injectable } from "@nestjs/common";
import { validarClaveAlmacenamiento } from "../entities/storage-key";
import type { SolicitudGuardarObjeto } from "../entities/storage-object";
import { RepositorioAlmacenamiento } from "../repositories/storage.repository";

const PATRON_TIPO_CONTENIDO =
  /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
const PATRON_CHECKSUM_SHA256_BASE64 = /^[A-Za-z0-9+/]{43}=$/;

/** Guarda desde un proceso confiable del backend, nunca desde datos crudos del cliente. */
@Injectable()
export class CasoUsoGuardarObjeto {
  constructor(private almacenamiento: RepositorioAlmacenamiento) {}

  ejecutar(solicitud: SolicitudGuardarObjeto) {
    validarClaveAlmacenamiento(solicitud.clave);
    if (
      !solicitud.contenido.byteLength ||
      !PATRON_TIPO_CONTENIDO.test(solicitud.tipoContenido)
    ) {
      throw new BadRequestException("storage.invalidContentType");
    }
    if (
      solicitud.checksumSha256Base64 &&
      !PATRON_CHECKSUM_SHA256_BASE64.test(solicitud.checksumSha256Base64)
    ) {
      throw new BadRequestException("storage.invalidChecksum");
    }
    return this.almacenamiento.guardar(solicitud);
  }
}
