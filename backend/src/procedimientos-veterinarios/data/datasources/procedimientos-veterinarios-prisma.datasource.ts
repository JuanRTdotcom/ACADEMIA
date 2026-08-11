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
import type { DatosProcedimientoVeterinario } from "../../domain/entities/procedimiento-veterinario";

type Tx = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosProcedimientosVeterinariosPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  private conflicto(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictException("procedures.duplicate");
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
    if (!actor) throw new NotFoundException("procedures.unavailable");
  }

  private async existente(tx: Tx, id: string, organizacion: string) {
    await tx.$queryRaw`SELECT id_procedimientos_veterinarios FROM nucleo.procedimientos_veterinarios WHERE id_procedimientos_veterinarios = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
    const tipo = await tx.procedimientos_veterinarios.findFirst({
      where: {
        id_procedimientos_veterinarios: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
      },
    });
    if (!tipo) throw new NotFoundException("procedures.notFound");
    return tipo;
  }

  async listar(organizacion: string) {
    const procedimientos = await this.prisma.procedimientos_veterinarios.findMany({
      where: {
        fid_organizaciones: organizacion,
        eliminado_en: null,
        organizacion: { estado: 1, eliminado_en: null },
      },
      orderBy: [
        { created_at: "desc" },
        { id_procedimientos_veterinarios: "desc" },
      ],
      select: {
        id_procedimientos_veterinarios: true,
        nombre: true,
        descripcion_guia: true,
        estado: true,
        created_at: true,
        updated_at: true,
      },
    });
    return { procedimientos, total: procedimientos.length };
  }

  async crear(
    organizacion: string,
    datos: DatosProcedimientoVeterinario,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const tipo = await tx.procedimientos_veterinarios.create({
          data: {
            fid_organizaciones: organizacion,
            nombre: datos.nombre,
            descripcion_guia: datos.descripcion_guia,
            created_by: usuario,
            updated_by: usuario,
          },
          select: { id_procedimientos_veterinarios: true, nombre: true, descripcion_guia: true },
        });
        await this.auditoria.registrar(
          {
            accion: "procedimientos_veterinarios.creado",
            entidad: "procedimientos_veterinarios",
            id_entidad: tipo.id_procedimientos_veterinarios,
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
    datos: DatosProcedimientoVeterinario,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const actual = await this.existente(tx, id, organizacion);
        if (
          actual.nombre === datos.nombre &&
          actual.descripcion_guia === datos.descripcion_guia
        )
          throw new BadRequestException("procedures.noChanges");
        await tx.procedimientos_veterinarios.update({
          where: { id_procedimientos_veterinarios: id },
          data: {
            nombre: datos.nombre,
            descripcion_guia: datos.descripcion_guia,
            updated_by: usuario,
          },
        });
        await this.auditoria.registrar(
          {
            accion: "procedimientos_veterinarios.modificado",
            entidad: "procedimientos_veterinarios",
            id_entidad: id,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion,
            metadatos: {
              anterior: { nombre: actual.nombre, descripcion_guia: actual.descripcion_guia },
              nuevo: {
                nombre: datos.nombre,
                descripcion_guia: datos.descripcion_guia,
              },
            },
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
        throw new BadRequestException("procedures.noChanges");
      await tx.procedimientos_veterinarios.update({
        where: { id_procedimientos_veterinarios: id },
        data: { estado, updated_by: usuario },
      });
      await this.auditoria.registrar(
        {
          accion: activo
            ? "procedimientos_veterinarios.activado"
            : "procedimientos_veterinarios.desactivado",
          entidad: "procedimientos_veterinarios",
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
      await tx.$executeRaw`UPDATE nucleo.procedimientos_veterinarios SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE id_procedimientos_veterinarios = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL`;
      await this.auditoria.registrar(
        {
          accion: "procedimientos_veterinarios.eliminado",
          entidad: "procedimientos_veterinarios",
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
