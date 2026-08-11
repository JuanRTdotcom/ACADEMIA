import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../../../prisma/generated/client/client";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { PrismaService } from "../../../comun/prisma.service";
import type { DatosTipoHospitalizacion } from "../../domain/entities/tipo-hospitalizacion";

type Tx = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosTiposHospitalizacionPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  private conflicto(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictException("hospitalizationTypes.duplicate");
    throw error;
  }

  private async contexto(tx: Tx, organizacion: string, usuario: string) {
    await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${organizacion}::uuid AND estado = 1 AND eliminado_en IS NULL FOR UPDATE`;
    const actor = await tx.usuarios.findFirst({
      where: {
        id_usuarios: usuario,
        fid_organizaciones: organizacion,
        estado: 1,
        estado_cuenta: "activo",
        eliminado_en: null,
      },
      select: { id_usuarios: true },
    });
    if (!actor) throw new NotFoundException("hospitalizationTypes.unavailable");
  }

  private async existente(tx: Tx, id: string, organizacion: string) {
    await tx.$queryRaw`SELECT id_tipos_hospitalizacion FROM nucleo.tipos_hospitalizacion WHERE id_tipos_hospitalizacion = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
    const tipo = await tx.tipos_hospitalizacion.findFirst({
      where: {
        id_tipos_hospitalizacion: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
      },
    });
    if (!tipo) throw new NotFoundException("hospitalizationTypes.notFound");
    return tipo;
  }

  async listar(organizacion: string) {
    const tipos = await this.prisma.tipos_hospitalizacion.findMany({
      where: {
        fid_organizaciones: organizacion,
        eliminado_en: null,
        organizacion: { estado: 1, eliminado_en: null },
      },
      orderBy: [
        { created_at: "desc" },
        { id_tipos_hospitalizacion: "desc" },
      ],
      select: {
        id_tipos_hospitalizacion: true,
        nombre: true,
        estado: true,
        created_at: true,
        updated_at: true,
      },
    });
    return { tipos, total: tipos.length };
  }

  async crear(
    organizacion: string,
    datos: DatosTipoHospitalizacion,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const tipo = await tx.tipos_hospitalizacion.create({
          data: {
            fid_organizaciones: organizacion,
            nombre: datos.nombre,
            created_by: usuario,
            updated_by: usuario,
          },
          select: { id_tipos_hospitalizacion: true, nombre: true },
        });
        await this.auditoria.registrar(
          {
            accion: "tipos_hospitalizacion.creado",
            entidad: "tipos_hospitalizacion",
            id_entidad: tipo.id_tipos_hospitalizacion,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion,
            metadatos: { nombre: tipo.nombre },
          },
          tx,
        );
        return tipo;
      });
    } catch (error) {
      this.conflicto(error);
    }
  }

  async actualizar(
    id: string,
    organizacion: string,
    datos: DatosTipoHospitalizacion,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const actual = await this.existente(tx, id, organizacion);
        if (actual.nombre === datos.nombre)
          throw new BadRequestException("hospitalizationTypes.noChanges");
        await tx.tipos_hospitalizacion.update({
          where: { id_tipos_hospitalizacion: id },
          data: { nombre: datos.nombre, updated_by: usuario },
        });
        await this.auditoria.registrar(
          {
            accion: "tipos_hospitalizacion.modificado",
            entidad: "tipos_hospitalizacion",
            id_entidad: id,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion,
            metadatos: { anterior: actual.nombre, nuevo: datos.nombre },
          },
          tx,
        );
      });
    } catch (error) {
      this.conflicto(error);
    }
  }

  async cambiarEstado(
    id: string,
    organizacion: string,
    activo: boolean,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await this.contexto(tx, organizacion, usuario);
      const actual = await this.existente(tx, id, organizacion);
      const estado = activo ? 1 : 0;
      if (actual.estado === estado)
        throw new BadRequestException("hospitalizationTypes.noChanges");
      await tx.tipos_hospitalizacion.update({
        where: { id_tipos_hospitalizacion: id },
        data: { estado, updated_by: usuario },
      });
      await this.auditoria.registrar(
        {
          accion: activo
            ? "tipos_hospitalizacion.activado"
            : "tipos_hospitalizacion.desactivado",
          entidad: "tipos_hospitalizacion",
          id_entidad: id,
          fid_organizaciones: organizacion,
          fid_usuarios: usuario,
          peticion,
          metadatos: { nombre: actual.nombre },
        },
        tx,
      );
    });
  }

  async eliminar(
    id: string,
    organizacion: string,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await this.contexto(tx, organizacion, usuario);
      const actual = await this.existente(tx, id, organizacion);
      await tx.$executeRaw`UPDATE nucleo.tipos_hospitalizacion SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE id_tipos_hospitalizacion = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL`;
      await this.auditoria.registrar(
        {
          accion: "tipos_hospitalizacion.eliminado",
          entidad: "tipos_hospitalizacion",
          id_entidad: id,
          fid_organizaciones: organizacion,
          fid_usuarios: usuario,
          peticion,
          metadatos: { nombre: actual.nombre },
        },
        tx,
      );
    });
  }
}
