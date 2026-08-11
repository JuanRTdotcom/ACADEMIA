import { Injectable, PayloadTooLargeException } from "@nestjs/common";
import { PrismaService } from "../../../comun/prisma.service";
import type {
  SolicitudCargaFirmada,
  SolicitudGuardarObjeto,
} from "../../domain/entities/storage-object";
import { RepositorioAlmacenamiento } from "../../domain/repositories/storage.repository";
import { FuenteDatosAlmacenamientoR2 } from "../datasources/r2-storage.datasource";

/** Implementación intercambiable del contrato de almacenamiento. */
@Injectable()
export class RepositorioAlmacenamientoDatos implements RepositorioAlmacenamiento {
  constructor(
    private r2: FuenteDatosAlmacenamientoR2,
    private prisma: PrismaService,
  ) {}

  private organizacion(clave: string): string {
    const id =
      /^tenants\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i.exec(
        clave,
      )?.[1];
    if (!id) throw new Error("La clave no pertenece a una organización");
    return id;
  }

  private async retirarRegistro(clave: string) {
    await this.prisma.$executeRaw`
      UPDATE nucleo.archivos_organizacion
      SET estado = 0, eliminado_en = CURRENT_TIMESTAMP
      WHERE clave_objeto = ${clave} AND estado <> 0
    `;
  }

  crearCargaFirmada(solicitud: SolicitudCargaFirmada) {
    return this.r2.crearCargaFirmada(solicitud);
  }

  crearDescargaFirmada(clave: string, nombreDescarga?: string) {
    return this.r2.crearDescargaFirmada(clave, nombreDescarga);
  }

  async guardar(solicitud: SolicitudGuardarObjeto) {
    const organizacion = this.organizacion(solicitud.clave);
    const bytes = BigInt(solicitud.contenido.byteLength);
    await this.prisma.$transaction(async (tx) => {
      const [tenant] = await tx.$queryRaw<
        Array<{ almacenamiento_max_bytes: bigint | null }>
      >`
        SELECT plan.almacenamiento_max_bytes
        FROM nucleo.organizaciones organizacion
        JOIN configuracion.planes plan ON plan.id_planes = organizacion.fid_planes
        WHERE organizacion.id_organizaciones = ${organizacion}::uuid
          AND organizacion.estado = 1
          AND organizacion.eliminado_en IS NULL
        FOR UPDATE OF organizacion
      `;
      if (!tenant) throw new Error("La organización no está disponible");
      const uso = await tx.archivos_organizacion.aggregate({
        where: { fid_organizaciones: organizacion, estado: { in: [1, 2] } },
        _sum: { bytes: true },
      });
      if (
        tenant.almacenamiento_max_bytes !== null &&
        (uso._sum.bytes ?? 0n) + bytes > tenant.almacenamiento_max_bytes
      ) {
        throw new PayloadTooLargeException("storage.quotaExceeded");
      }
      await tx.archivos_organizacion.create({
        data: {
          fid_organizaciones: organizacion,
          clave_objeto: solicitud.clave,
          tipo_mime: solicitud.tipoContenido,
          bytes,
          estado: 2,
        },
      });
    });
    try {
      await this.r2.guardar(solicitud);
      await this.prisma.archivos_organizacion.update({
        where: { clave_objeto: solicitud.clave },
        data: { estado: 1 },
      });
    } catch (error) {
      await this.r2.eliminar(solicitud.clave).catch(() => undefined);
      await this.retirarRegistro(solicitud.clave).catch(() => undefined);
      throw error;
    }
  }

  leer(clave: string) {
    return this.r2.leer(clave);
  }

  inspeccionar(clave: string) {
    return this.r2.inspeccionar(clave);
  }

  async eliminar(clave: string) {
    await this.r2.eliminar(clave);
    await this.retirarRegistro(clave);
  }
}
