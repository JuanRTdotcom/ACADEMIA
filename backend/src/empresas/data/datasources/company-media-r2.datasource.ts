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
import { CasoUsoLeerObjeto } from "../../../storage/domain/usecases/read-object";
import { CasoUsoGuardarObjeto } from "../../../storage/domain/usecases/save-object";
import type {
  ArchivoMedioEmpresa,
  MedioEmpresa,
  TipoMedioEmpresa,
} from "../../domain/entities/medio-empresa";

const MAXIMO_PIXELES_ENTRADA = 30_000_000;
const CALIDAD_INICIAL = 90;
const CALIDAD_MINIMA = 35;
const PASO_CALIDAD = 7;

const POLITICAS: Record<
  TipoMedioEmpresa,
  {
    ancho: number;
    alto: number;
    maximo: number;
    ajuste: "cover" | "contain";
    formatosEntrada: ReadonlySet<"jpeg" | "png" | "webp">;
    extensionesEntrada: ReadonlySet<string>;
    formatoSalida: "jpeg" | "png" | "webp";
    extensionSalida: ".jpg" | ".png" | ".webp";
    mimeSalida: "image/jpeg" | "image/png" | "image/webp";
  }
> = {
  escudo: {
    ancho: 256,
    alto: 256,
    maximo: 40 * 1024,
    ajuste: "contain",
    formatosEntrada: new Set(["png"]),
    extensionesEntrada: new Set([".png"]),
    formatoSalida: "png",
    extensionSalida: ".png",
    mimeSalida: "image/png",
  },
  escudo_oscuro: {
    ancho: 256,
    alto: 256,
    maximo: 40 * 1024,
    ajuste: "contain",
    formatosEntrada: new Set(["png"]),
    extensionesEntrada: new Set([".png"]),
    formatoSalida: "png",
    extensionSalida: ".png",
    mimeSalida: "image/png",
  },
  imagotipo: {
    ancho: 640,
    alto: 200,
    maximo: 80 * 1024,
    ajuste: "contain",
    formatosEntrada: new Set(["png"]),
    extensionesEntrada: new Set([".png"]),
    formatoSalida: "png",
    extensionSalida: ".png",
    mimeSalida: "image/png",
  },
  imagotipo_oscuro: {
    ancho: 640,
    alto: 200,
    maximo: 80 * 1024,
    ajuste: "contain",
    formatosEntrada: new Set(["png"]),
    extensionesEntrada: new Set([".png"]),
    formatoSalida: "png",
    extensionSalida: ".png",
    mimeSalida: "image/png",
  },
  portada: {
    ancho: 1280,
    alto: 1920,
    maximo: 100 * 1024,
    ajuste: "cover",
    formatosEntrada: new Set(["jpeg"]),
    extensionesEntrada: new Set([".jpg", ".jpeg"]),
    formatoSalida: "webp",
    extensionSalida: ".webp",
    mimeSalida: "image/webp",
  },
  login_escudo: {
    ancho: 256,
    alto: 256,
    maximo: 40 * 1024,
    ajuste: "contain",
    formatosEntrada: new Set(["png"]),
    extensionesEntrada: new Set([".png"]),
    formatoSalida: "png",
    extensionSalida: ".png",
    mimeSalida: "image/png",
  },
  login_escudo_oscuro: {
    ancho: 256,
    alto: 256,
    maximo: 40 * 1024,
    ajuste: "contain",
    formatosEntrada: new Set(["png"]),
    extensionesEntrada: new Set([".png"]),
    formatoSalida: "png",
    extensionSalida: ".png",
    mimeSalida: "image/png",
  },
};

const MENSAJES_FORMATO: Record<TipoMedioEmpresa, string> = {
  escudo: "companies.media.invalidShieldFile",
  escudo_oscuro: "companies.media.invalidShieldFile",
  imagotipo: "companies.media.invalidLogotypeFile",
  imagotipo_oscuro: "companies.media.invalidLogotypeFile",
  portada: "companies.media.invalidFile",
  login_escudo: "companies.media.invalidShieldFile",
  login_escudo_oscuro: "companies.media.invalidShieldFile",
};

function formatoDeclarado(tipoMime: string): "jpeg" | "png" | "webp" | null {
  if (tipoMime === "image/jpeg") return "jpeg";
  if (tipoMime === "image/png") return "png";
  if (tipoMime === "image/webp") return "webp";
  return null;
}

function firmaValida(contenido: Buffer, formato: "jpeg" | "png" | "webp") {
  if (formato === "jpeg") {
    return (
      contenido.length >= 3 &&
      contenido[0] === 0xff &&
      contenido[1] === 0xd8 &&
      contenido[2] === 0xff
    );
  }
  if (formato === "png") {
    return (
      contenido.length >= 8 &&
      contenido
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  return (
    contenido.length >= 12 &&
    contenido.subarray(0, 4).toString("ascii") === "RIFF" &&
    contenido.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

@Injectable()
export class AlmacenMediosEmpresaR2 {
  private readonly logger = new Logger(AlmacenMediosEmpresaR2.name);
  private readonly maximoOriginal: number;

  constructor(
    configuracion: ConfigService,
    private guardarObjeto: CasoUsoGuardarObjeto,
    private leerObjeto: CasoUsoLeerObjeto,
    private eliminarObjeto: CasoUsoEliminarObjeto,
  ) {
    this.maximoOriginal = configuracion.getOrThrow<number>(
      "COMPANY_MEDIA_MAX_BYTES",
    );
  }

  private async comprimir(
    normalizada: Buffer,
    formato: "jpeg" | "png" | "webp",
    maximo: number,
    calidad = CALIDAD_INICIAL,
  ): Promise<Buffer> {
    const imagen = sharp(normalizada, { failOn: "error" });
    const contenido = await (
      formato === "png"
        ? imagen.png({
            compressionLevel: 9,
            effort: 10,
            palette: true,
            quality: calidad,
          })
        : formato === "jpeg"
          ? imagen
              .flatten({ background: "#ffffff" })
              .jpeg({ quality: calidad, mozjpeg: true })
          : imagen.webp({ quality: calidad, alphaQuality: 90, effort: 6 })
    ).toBuffer();
    if (contenido.length <= maximo) return contenido;
    if (calidad <= CALIDAD_MINIMA) {
      throw new UnprocessableEntityException("companies.media.cannotOptimize");
    }
    return this.comprimir(normalizada, formato, maximo, calidad - PASO_CALIDAD);
  }

  async guardar(
    idOrganizacion: string,
    tipo: TipoMedioEmpresa,
    archivo: ArchivoMedioEmpresa,
  ): Promise<{ clave: string; bytes: number }> {
    const extension = extname(archivo.nombre_original).toLowerCase();
    const formato = formatoDeclarado(archivo.tipo_mime);
    const politica = POLITICAS[tipo];
    const mensajeFormato = MENSAJES_FORMATO[tipo];
    if (archivo.contenido.length > this.maximoOriginal) {
      throw new PayloadTooLargeException("companies.media.tooLarge");
    }
    if (
      !archivo.contenido.length ||
      !formato ||
      !politica.formatosEntrada.has(formato) ||
      !politica.extensionesEntrada.has(extension) ||
      !firmaValida(archivo.contenido, formato)
    ) {
      throw new BadRequestException(mensajeFormato);
    }
    const formatoExtension =
      extension === ".png" ? "png" : extension === ".webp" ? "webp" : "jpeg";
    if (formatoExtension !== formato) {
      throw new BadRequestException(mensajeFormato);
    }

    let contenido: Buffer;
    try {
      const imagen = sharp(archivo.contenido, {
        failOn: "warning",
        limitInputPixels: MAXIMO_PIXELES_ENTRADA,
      });
      const metadatos = await imagen.metadata();
      if (
        metadatos.format !== formato ||
        !metadatos.width ||
        !metadatos.height ||
        metadatos.width * metadatos.height > MAXIMO_PIXELES_ENTRADA ||
        (metadatos.pages ?? 1) !== 1
      ) {
        throw new Error("Imagen no permitida");
      }
      let procesada = imagen.rotate().resize(politica.ancho, politica.alto, {
        fit: politica.ajuste,
        position: "centre",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
      if (tipo === "portada")
        procesada = procesada.flatten({ background: "#172554" });
      const normalizada = await procesada
        .png({ compressionLevel: 9 })
        .toBuffer();
      contenido = await this.comprimir(
        normalizada,
        politica.formatoSalida,
        politica.maximo,
      );
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      throw new BadRequestException(mensajeFormato);
    }

    const clave = `tenants/${idOrganizacion}/branding/${tipo}/${randomUUID()}${politica.extensionSalida}`;
    await this.guardarObjeto.ejecutar({
      clave,
      contenido,
      tipoContenido: politica.mimeSalida,
      checksumSha256Base64: createHash("sha256")
        .update(contenido)
        .digest("base64"),
      cacheControl: "public, max-age=31536000, immutable",
    });
    return { clave, bytes: contenido.length };
  }

  async leer(clave: string): Promise<MedioEmpresa> {
    const objeto = await this.leerObjeto.ejecutar(clave);
    const extension = extname(clave).toLowerCase();
    const mimeEsperado =
      extension === ".png"
        ? "image/png"
        : extension === ".jpg" || extension === ".jpeg"
          ? "image/jpeg"
          : extension === ".webp"
            ? "image/webp"
            : null;
    if (!objeto || !mimeEsperado || objeto.tipoContenido !== mimeEsperado) {
      throw new NotFoundException("companies.media.notFound");
    }
    return {
      contenido: Buffer.from(objeto.contenido),
      tipo_mime: mimeEsperado,
      version: clave,
    };
  }

  async eliminarSeguro(clave: string | null): Promise<void> {
    if (!clave) return;
    try {
      await this.eliminarObjeto.ejecutar(clave);
    } catch {
      this.logger.warn(
        "No se pudo eliminar un medio de empresa huérfano de R2",
      );
    }
  }
}
