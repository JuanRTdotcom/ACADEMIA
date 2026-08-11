import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import sharp from "sharp";
import { CasoUsoEliminarObjeto } from "../../../storage/domain/usecases/delete-object";
import { CasoUsoGuardarObjeto } from "../../../storage/domain/usecases/save-object";
import { CasoUsoLeerObjeto } from "../../../storage/domain/usecases/read-object";
import type { ArchivoMascota } from "../../domain/entities/mascota";

const MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const EXTENSION = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const DIMENSION = 130;
const CALIDAD = 90;
const CALIDAD_MINIMA = 1;
const PASO_CALIDAD = 5;
const MAXIMO_PROCESADO_BYTES = 10 * 1024;
const MAX_PIXELES = 25_000_000;

@Injectable()
export class AlmacenFotoMascotaR2 {
  private readonly logger = new Logger(AlmacenFotoMascotaR2.name);
  private readonly maximoBytes: number;
  constructor(
    config: ConfigService,
    private guardarObjeto: CasoUsoGuardarObjeto,
    private leerObjeto: CasoUsoLeerObjeto,
    private eliminarObjeto: CasoUsoEliminarObjeto,
  ) {
    this.maximoBytes = config.getOrThrow<number>("AVATAR_MAX_BYTES");
  }

  private async comprimirHastaLimite(
    imagen: Buffer,
    calidad = CALIDAD,
  ): Promise<Buffer> {
    const contenido = await sharp(imagen, {
      failOn: "error",
      limitInputPixels: DIMENSION * DIMENSION,
    })
      .jpeg({ quality: calidad, mozjpeg: true })
      .toBuffer();
    if (contenido.length <= MAXIMO_PROCESADO_BYTES) return contenido;
    if (calidad === CALIDAD_MINIMA)
      throw new UnprocessableEntityException("pets.cannotOptimizePhoto");
    return this.comprimirHastaLimite(
      imagen,
      Math.max(CALIDAD_MINIMA, calidad - PASO_CALIDAD),
    );
  }

  async guardar(
    organizacion: string,
    mascota: string,
    archivo: ArchivoMascota,
  ) {
    const extension = extname(archivo.nombre_original).toLowerCase();
    if (archivo.contenido.length > this.maximoBytes)
      throw new PayloadTooLargeException("pets.photoTooLarge");
    if (
      !archivo.contenido.length ||
      !MIME.has(archivo.tipo_mime) ||
      !EXTENSION.has(extension)
    )
      throw new BadRequestException("pets.invalidPhoto");
    const png = archivo.contenido
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const jpeg =
      archivo.contenido[0] === 0xff &&
      archivo.contenido[1] === 0xd8 &&
      archivo.contenido[2] === 0xff;
    const webp =
      archivo.contenido.subarray(0, 4).toString("ascii") === "RIFF" &&
      archivo.contenido.subarray(8, 12).toString("ascii") === "WEBP";
    const tipoMime =
      archivo.tipo_mime === "image/jpg" ? "image/jpeg" : archivo.tipo_mime;
    const tipoDetectado = png
      ? "image/png"
      : jpeg
        ? "image/jpeg"
        : webp
          ? "image/webp"
          : null;
    if (tipoMime !== tipoDetectado)
      throw new BadRequestException("pets.invalidPhoto");
    let contenido: Buffer;
    try {
      const imagen = sharp(archivo.contenido, {
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
      const normalizada = await imagen
        .rotate()
        .resize(DIMENSION, DIMENSION, { fit: "cover", position: "centre" })
        .flatten({ background: "#ffffff" })
        .png({ compressionLevel: 9 })
        .toBuffer();
      contenido = await this.comprimirHastaLimite(normalizada);
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      throw new BadRequestException("pets.invalidPhoto");
    }
    const clave = `tenants/${organizacion}/pets/${mascota}/photo/${randomUUID()}.jpg`;
    await this.guardarObjeto.ejecutar({
      clave,
      contenido,
      tipoContenido: "image/jpeg",
      checksumSha256Base64: createHash("sha256")
        .update(contenido)
        .digest("base64"),
      cacheControl: "private, no-store",
    });
    return clave;
  }

  async leer(clave: string) {
    const objeto = await this.leerObjeto.ejecutar(clave);
    if (!objeto || objeto.tipoContenido !== "image/jpeg")
      throw new NotFoundException("pets.photoNotFound");
    return {
      contenido: Buffer.from(objeto.contenido),
      tipo_mime: "image/jpeg" as const,
    };
  }

  async eliminarSeguro(clave: string | null) {
    if (!clave) return;
    try {
      await this.eliminarObjeto.ejecutar(clave);
    } catch {
      this.logger.warn("No se pudo eliminar una foto huérfana de mascota");
    }
  }
}
