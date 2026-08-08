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
import { CasoUsoEliminarObjeto } from "../../../../storage/domain/usecases/delete-object";
import { CasoUsoLeerObjeto } from "../../../../storage/domain/usecases/read-object";
import { CasoUsoGuardarObjeto } from "../../../../storage/domain/usecases/save-object";
import type {
  ArchivoAvatarEntrada,
  AvatarPerfil,
} from "../../../domain/entities/avatar-perfil";

const MIME_PERMITIDOS = new Set(["image/jpeg", "image/png"]);
const EXTENSIONES_PERMITIDAS = new Set([".jpg", ".jpeg", ".png"]);
const DIMENSION_AVATAR = 80;
const CALIDAD_AVATAR = 90;
const CALIDAD_MINIMA_AVATAR = 1;
const PASO_CALIDAD_AVATAR = 5;
const MAXIMO_AVATAR_PROCESADO_BYTES = 5 * 1024;
const MAXIMO_PIXELES_ENTRADA = 25_000_000;

function tieneFirmaPng(contenido: Buffer): boolean {
  return (
    contenido.length >= 8 &&
    contenido
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  );
}

function tieneFirmaJpeg(contenido: Buffer): boolean {
  return (
    contenido.length >= 3 &&
    contenido[0] === 0xff &&
    contenido[1] === 0xd8 &&
    contenido[2] === 0xff
  );
}

/** Procesa el original no confiable y guarda únicamente el JPEG seguro en R2. */
@Injectable()
export class AlmacenAvatarR2 {
  private readonly logger = new Logger(AlmacenAvatarR2.name);
  private readonly maximoBytes: number;

  constructor(
    configuracion: ConfigService,
    private guardarObjeto: CasoUsoGuardarObjeto,
    private leerObjeto: CasoUsoLeerObjeto,
    private eliminarObjeto: CasoUsoEliminarObjeto,
  ) {
    this.maximoBytes = configuracion.getOrThrow<number>("AVATAR_MAX_BYTES");
  }

  /** Reduce calidad con un límite inferior para evitar recursión infinita. */
  private async comprimirHastaLimite(
    imagenNormalizada: Buffer,
    calidad = CALIDAD_AVATAR,
  ): Promise<Buffer> {
    const contenido = await sharp(imagenNormalizada, {
      failOn: "error",
      limitInputPixels: DIMENSION_AVATAR * DIMENSION_AVATAR,
    })
      .jpeg({ quality: calidad, mozjpeg: true })
      .toBuffer();

    if (contenido.length <= MAXIMO_AVATAR_PROCESADO_BYTES) return contenido;
    if (calidad === CALIDAD_MINIMA_AVATAR) {
      throw new UnprocessableEntityException("profile.avatar.cannotOptimize");
    }

    return this.comprimirHastaLimite(
      imagenNormalizada,
      Math.max(CALIDAD_MINIMA_AVATAR, calidad - PASO_CALIDAD_AVATAR),
    );
  }

  async guardar(
    idOrganizacion: string,
    idUsuario: string,
    archivo: ArchivoAvatarEntrada,
  ): Promise<{ clave: string }> {
    const extension = extname(archivo.nombre_original).toLowerCase();
    if (archivo.contenido.length > this.maximoBytes) {
      throw new PayloadTooLargeException("profile.avatar.tooLarge");
    }
    if (
      !archivo.contenido.length ||
      !MIME_PERMITIDOS.has(archivo.tipo_mime) ||
      !EXTENSIONES_PERMITIDAS.has(extension)
    ) {
      throw new BadRequestException("profile.avatar.invalidFile");
    }

    const formatoDeclarado = archivo.tipo_mime === "image/png" ? "png" : "jpeg";
    const formatoExtension = extension === ".png" ? "png" : "jpeg";
    const firmaValida =
      formatoDeclarado === "png"
        ? tieneFirmaPng(archivo.contenido)
        : tieneFirmaJpeg(archivo.contenido);
    if (formatoDeclarado !== formatoExtension || !firmaValida) {
      throw new BadRequestException("profile.avatar.invalidFile");
    }

    let contenido: Buffer;
    try {
      const imagen = sharp(archivo.contenido, {
        failOn: "warning",
        limitInputPixels: MAXIMO_PIXELES_ENTRADA,
      });
      const metadatos = await imagen.metadata();
      if (
        metadatos.format !== formatoDeclarado ||
        !metadatos.width ||
        !metadatos.height ||
        metadatos.width * metadatos.height > MAXIMO_PIXELES_ENTRADA ||
        (metadatos.pages ?? 1) !== 1
      ) {
        throw new Error("Formato de imagen no permitido");
      }

      // La recodificación elimina EXIF, perfiles, comentarios y contenido añadido.
      const normalizada = await imagen
        .rotate()
        .resize(DIMENSION_AVATAR, DIMENSION_AVATAR, {
          fit: "cover",
          position: "centre",
        })
        .flatten({ background: "#ffffff" })
        .png({ compressionLevel: 9 })
        .toBuffer();
      contenido = await this.comprimirHastaLimite(normalizada);
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      throw new BadRequestException("profile.avatar.invalidFile");
    }

    const clave =
      `tenants/${idOrganizacion}/users/${idUsuario}/` +
      `profile/avatar/${randomUUID()}.jpg`;
    const checksumSha256Base64 = createHash("sha256")
      .update(contenido)
      .digest("base64");
    await this.guardarObjeto.ejecutar({
      clave,
      contenido,
      tipoContenido: "image/jpeg",
      checksumSha256Base64,
      cacheControl: "private, no-store",
    });
    return { clave };
  }

  async leer(clave: string): Promise<AvatarPerfil> {
    const objeto = await this.leerObjeto.ejecutar(clave);
    if (!objeto || objeto.tipoContenido !== "image/jpeg") {
      throw new NotFoundException("profile.avatar.notFound");
    }
    return {
      contenido: Buffer.from(objeto.contenido),
      tipo_mime: "image/jpeg",
      version: clave,
    };
  }

  /** La referencia de base ya cambió; un fallo de limpieza no rompe la petición. */
  async eliminarSeguro(clave: string | null): Promise<void> {
    if (!clave) return;
    try {
      await this.eliminarObjeto.ejecutar(clave);
    } catch {
      this.logger.warn("No se pudo eliminar un avatar huérfano de R2");
    }
  }
}
