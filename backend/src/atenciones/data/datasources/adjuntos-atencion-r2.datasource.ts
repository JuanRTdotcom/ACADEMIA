import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "node:crypto";
import { basename } from "node:path";
import sharp from "sharp";
import { CasoUsoEliminarObjeto } from "../../../storage/domain/usecases/delete-object";
import { CasoUsoGuardarObjeto } from "../../../storage/domain/usecases/save-object";
import { CasoUsoLeerObjeto } from "../../../storage/domain/usecases/read-object";
import type {
  AdjuntoAtencionGuardado,
  ArchivoAdjuntoAtencion,
} from "../../domain/entities/atencion";
import {
  formatoAdjuntoAtencion,
  type FormatoAdjuntoAtencion,
} from "./formatos-adjuntos-atencion";

const MAX_PIXELES = 30_000_000;
const FIRMA_OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

@Injectable()
export class AlmacenAdjuntosAtencionR2 {
  private readonly logger = new Logger(AlmacenAdjuntosAtencionR2.name);
  private readonly maximo: number;
  private readonly cacheTtl: number;
  constructor(
    config: ConfigService,
    private guardarObjeto: CasoUsoGuardarObjeto,
    private leerObjeto: CasoUsoLeerObjeto,
    private eliminarObjeto: CasoUsoEliminarObjeto,
  ) {
    this.maximo = config.getOrThrow<number>("ATTENTION_ATTACHMENT_MAX_BYTES");
    this.cacheTtl = config.getOrThrow<number>(
      "ATTENTION_ATTACHMENT_CACHE_TTL_SECONDS",
    );
  }

  async guardar(
    organizacion: string,
    atencion: string,
    registro: string,
    archivo: ArchivoAdjuntoAtencion,
  ): Promise<AdjuntoAtencionGuardado> {
    if (archivo.contenido.length > this.maximo)
      throw new PayloadTooLargeException("attentions.attachmentTooLarge");
    const formato = formatoAdjuntoAtencion(
      archivo.nombre_original,
      archivo.tipo_mime,
    );
    const nombre = basename(archivo.nombre_original).slice(0, 180);
    if (!archivo.contenido.length)
      throw new BadRequestException({
        message: "attentions.attachmentEmpty",
        args: { file: nombre },
      });
    if (!formato)
      throw new BadRequestException({
        message: "attentions.invalidAttachmentType",
        args: { file: nombre },
      });
    if (!this.firmaValida(archivo.contenido, formato))
      throw new BadRequestException({
        message: "attentions.invalidAttachmentContent",
        args: { file: nombre },
      });

    const esImagen = formato.familia === "imagen";
    const contenido = esImagen
      ? await this.normalizarImagen(archivo.contenido, formato.tipoMime, nombre)
      : archivo.contenido;
    const tipoMime = esImagen ? "image/jpeg" : formato.tipoMime;
    const extension = esImagen ? ".jpg" : formato.extension;
    const checksum = createHash("sha256").update(contenido).digest();
    const clave = `tenants/${organizacion}/attentions/${atencion}/records/${registro}/attachments/${randomUUID()}${extension}`;
    await this.guardarObjeto.ejecutar({
      clave,
      contenido,
      tipoContenido: tipoMime,
      checksumSha256Base64: checksum.toString("base64"),
      cacheControl: `private, max-age=${this.cacheTtl}, immutable`,
    });
    return {
      clave_objeto: clave,
      nombre_original: basename(archivo.nombre_original).slice(0, 180),
      tipo_mime: tipoMime,
      bytes: contenido.length,
      checksum_sha256: checksum.toString("hex"),
    };
  }

  private firmaValida(
    contenido: Buffer,
    formato: FormatoAdjuntoAtencion,
  ): boolean {
    const png = contenido
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const jpeg =
      contenido[0] === 0xff && contenido[1] === 0xd8 && contenido[2] === 0xff;
    const webp =
      contenido.subarray(0, 4).toString("ascii") === "RIFF" &&
      contenido.subarray(8, 12).toString("ascii") === "WEBP";
    if (formato.tipoMime === "image/png") return png;
    if (formato.tipoMime === "image/jpeg") return jpeg;
    if (formato.tipoMime === "image/webp") return webp;
    if (formato.familia === "pdf")
      return (
        contenido.subarray(0, 5).toString("ascii") === "%PDF-" &&
        contenido.includes(Buffer.from("%%EOF"))
      );
    if (["word", "excel", "powerpoint"].includes(formato.familia)) {
      if ([".doc", ".xls", ".ppt"].includes(formato.extension))
        return contenido.subarray(0, 8).equals(FIRMA_OLE);
      return this.zipConMarcador(contenido, formato.marcadorZip);
    }
    return this.zipConMarcador(contenido, formato.marcadorZip);
  }

  private zipConMarcador(contenido: Buffer, marcador?: string): boolean {
    const zip =
      contenido.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
      contenido.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    return Boolean(
      zip && marcador && contenido.includes(Buffer.from(marcador)),
    );
  }

  private async normalizarImagen(
    original: Buffer,
    tipoEsperado: string,
    nombre: string,
  ): Promise<Buffer> {
    try {
      const imagen = sharp(original, {
        failOn: "warning",
        limitInputPixels: MAX_PIXELES,
      });
      const meta = await imagen.metadata();
      if (
        !meta.width ||
        !meta.height ||
        meta.width * meta.height > MAX_PIXELES ||
        (meta.pages ?? 1) !== 1
      )
        throw new Error("invalid");
      if (`image/${meta.format}` !== tipoEsperado) throw new Error("invalid");
      return await imagen
        .rotate()
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 75, mozjpeg: true })
        .toBuffer();
    } catch {
      throw new BadRequestException({
        message: "attentions.invalidAttachmentContent",
        args: { file: nombre },
      });
    }
  }

  async leer(clave: string, tipoMime: string) {
    const objeto = await this.leerObjeto.ejecutar(clave);
    if (!objeto || objeto.tipoContenido !== tipoMime)
      throw new NotFoundException("attentions.attachmentNotFound");
    return Buffer.from(objeto.contenido);
  }

  async eliminarSeguro(clave: string | null) {
    if (!clave) return;
    try {
      await this.eliminarObjeto.ejecutar(clave);
    } catch {
      this.logger.warn("No se pudo eliminar un adjunto huérfano de atención");
    }
  }

  async eliminarTodos(claves: string[]) {
    await Promise.all(claves.map((clave) => this.eliminarSeguro(clave)));
  }
}
