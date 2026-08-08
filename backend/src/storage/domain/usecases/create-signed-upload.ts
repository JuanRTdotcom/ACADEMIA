import { BadRequestException, Injectable } from "@nestjs/common";
import { validarClaveAlmacenamiento } from "../entities/storage-key";
import type { SolicitudCargaFirmada } from "../entities/storage-object";
import { RepositorioAlmacenamiento } from "../repositories/storage.repository";

const PATRON_TIPO_CONTENIDO =
  /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
const PATRON_CHECKSUM_SHA256_BASE64 = /^[A-Za-z0-9+/]{43}=$/;

/** Genera permiso temporal para un PUT directo, nunca entrega credenciales R2. */
@Injectable()
export class CasoUsoCrearCargaFirmada {
  constructor(private almacenamiento: RepositorioAlmacenamiento) {}

  ejecutar(solicitud: SolicitudCargaFirmada) {
    validarClaveAlmacenamiento(solicitud.clave);
    if (!PATRON_TIPO_CONTENIDO.test(solicitud.tipoContenido)) {
      throw new BadRequestException("storage.invalidContentType");
    }
    if (!Number.isSafeInteger(solicitud.bytes) || solicitud.bytes <= 0) {
      throw new BadRequestException("storage.invalidSize");
    }
    if (
      solicitud.checksumSha256Base64 &&
      !PATRON_CHECKSUM_SHA256_BASE64.test(solicitud.checksumSha256Base64)
    ) {
      throw new BadRequestException("storage.invalidChecksum");
    }
    return this.almacenamiento.crearCargaFirmada(solicitud);
  }
}
