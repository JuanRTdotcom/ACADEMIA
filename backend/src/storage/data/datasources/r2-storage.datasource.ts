import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  AccesoFirmado,
  ObjetoAlmacenado,
  ObjetoConContenido,
  SolicitudCargaFirmada,
  SolicitudGuardarObjeto,
} from "../../domain/entities/storage-object";

/** Adaptador S3 para el bucket privado Cloudflare R2. */
@Injectable()
export class FuenteDatosAlmacenamientoR2 {
  private readonly cliente: S3Client;
  private readonly bucket: string;
  private readonly ttl: number;

  constructor(configuracion: ConfigService) {
    this.bucket = configuracion.getOrThrow<string>("STORAGE_BUCKET");
    this.ttl = configuracion.getOrThrow<number>(
      "STORAGE_SIGNED_URL_TTL_SECONDS",
    );
    this.cliente = new S3Client({
      region: configuracion.getOrThrow<string>("STORAGE_REGION"),
      endpoint: configuracion.getOrThrow<string>("STORAGE_ENDPOINT"),
      credentials: {
        accessKeyId: configuracion.getOrThrow<string>("STORAGE_ACCESS_KEY_ID"),
        secretAccessKey: configuracion.getOrThrow<string>(
          "STORAGE_SECRET_ACCESS_KEY",
        ),
      },
    });
  }

  async crearCargaFirmada(
    solicitud: SolicitudCargaFirmada,
  ): Promise<AccesoFirmado> {
    const comando = new PutObjectCommand({
      Bucket: this.bucket,
      Key: solicitud.clave,
      ContentType: solicitud.tipoContenido,
      ContentLength: solicitud.bytes,
      ChecksumSHA256: solicitud.checksumSha256Base64,
    });
    const url = await getSignedUrl(this.cliente, comando, {
      expiresIn: this.ttl,
    });
    const encabezados: Record<string, string> = {
      "content-type": solicitud.tipoContenido,
      "content-length": String(solicitud.bytes),
    };
    if (solicitud.checksumSha256Base64) {
      encabezados["x-amz-checksum-sha256"] = solicitud.checksumSha256Base64;
    }
    return { url, expiraEnSegundos: this.ttl, encabezados };
  }

  async crearDescargaFirmada(
    clave: string,
    nombreDescarga?: string,
  ): Promise<AccesoFirmado> {
    const disposicion = nombreDescarga
      ? `attachment; filename*=UTF-8''${encodeURIComponent(nombreDescarga)}`
      : undefined;
    const url = await getSignedUrl(
      this.cliente,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: clave,
        ResponseContentDisposition: disposicion,
      }),
      { expiresIn: this.ttl },
    );
    return { url, expiraEnSegundos: this.ttl, encabezados: {} };
  }

  async guardar(solicitud: SolicitudGuardarObjeto): Promise<void> {
    await this.cliente.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: solicitud.clave,
        Body: solicitud.contenido,
        ContentType: solicitud.tipoContenido,
        ContentLength: solicitud.contenido.byteLength,
        ChecksumSHA256: solicitud.checksumSha256Base64,
        CacheControl: solicitud.cacheControl,
      }),
    );
  }

  async leer(clave: string): Promise<ObjetoConContenido | null> {
    try {
      const resultado = await this.cliente.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: clave }),
      );
      if (!resultado.Body) return null;
      return {
        clave,
        contenido: await resultado.Body.transformToByteArray(),
        bytes: resultado.ContentLength ?? 0,
        tipoContenido: resultado.ContentType ?? null,
        etag: resultado.ETag?.replace(/^"|"$/g, "") ?? null,
        ultimaModificacion: resultado.LastModified ?? null,
      };
    } catch (error) {
      if (this.esNoEncontrado(error)) return null;
      throw error;
    }
  }

  async inspeccionar(clave: string): Promise<ObjetoAlmacenado | null> {
    try {
      const resultado = await this.cliente.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: clave }),
      );
      return {
        clave,
        bytes: resultado.ContentLength ?? 0,
        tipoContenido: resultado.ContentType ?? null,
        etag: resultado.ETag?.replace(/^"|"$/g, "") ?? null,
        ultimaModificacion: resultado.LastModified ?? null,
      };
    } catch (error) {
      if (this.esNoEncontrado(error)) return null;
      throw error;
    }
  }

  async eliminar(clave: string): Promise<void> {
    await this.cliente.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }),
    );
  }

  private esNoEncontrado(error: unknown): boolean {
    const datos = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    return (
      datos.name === "NotFound" ||
      datos.name === "NoSuchKey" ||
      datos.$metadata?.httpStatusCode === 404
    );
  }
}
