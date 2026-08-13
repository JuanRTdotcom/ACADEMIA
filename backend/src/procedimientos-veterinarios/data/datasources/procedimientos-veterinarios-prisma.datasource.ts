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
import type { DatosProcedimientoVeterinario, FiltrosProcedimientosVeterinarios } from "../../domain/entities/procedimiento-veterinario";

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

  private readonly seleccion = { id_procedimientos_veterinarios: true, nombre: true, descripcion_guia: true, estado: true, created_at: true, updated_at: true } satisfies Prisma.procedimientos_veterinariosSelect;

  async listar(organizacion: string, filtros: FiltrosProcedimientosVeterinarios) {
    const texto = filtros.consulta ? { AND: [{ OR: [{ nombre: { contains: filtros.consulta, mode: Prisma.QueryMode.insensitive } }, { descripcion_guia: { contains: filtros.consulta, mode: Prisma.QueryMode.insensitive } }] }] } : {};
    const base = { fid_organizaciones: organizacion, eliminado_en: null, organizacion: { estado: 1, eliminado_en: null }, ...texto };
    const cursorId = filtros.despues_de ?? filtros.antes_de;
    const cursor = cursorId ? await this.prisma.procedimientos_veterinarios.findFirst({ where: { ...base, id_procedimientos_veterinarios: cursorId }, select: { id_procedimientos_veterinarios: true, created_at: true } }) : null;
    if (cursorId && !cursor) throw new BadRequestException("procedures.invalidCursor");
    const atras = Boolean(filtros.antes_de);
    const condicion = cursor ? { OR: atras ? [{ created_at: { gt: cursor.created_at } }, { created_at: cursor.created_at, id_procedimientos_veterinarios: { gt: cursor.id_procedimientos_veterinarios } }] : [{ created_at: { lt: cursor.created_at } }, { created_at: cursor.created_at, id_procedimientos_veterinarios: { lt: cursor.id_procedimientos_veterinarios } }] } : {};
    const [procedimientos, total] = await Promise.all([
      this.prisma.procedimientos_veterinarios.findMany({ where: { ...base, ...condicion }, orderBy: atras ? [{ created_at: "asc" }, { id_procedimientos_veterinarios: "asc" }] : [{ created_at: "desc" }, { id_procedimientos_veterinarios: "desc" }], take: 11, select: this.seleccion }),
      this.prisma.procedimientos_veterinarios.count({ where: base }),
    ]);
    const hayMas = procedimientos.length > 10; if (hayMas) procedimientos.pop(); if (atras) procedimientos.reverse();
    return { procedimientos, total, paginacion: { anterior: procedimientos.length && (atras ? hayMas : Boolean(filtros.despues_de)) ? procedimientos[0]!.id_procedimientos_veterinarios : null, siguiente: procedimientos.length && (atras || hayMas) ? procedimientos.at(-1)!.id_procedimientos_veterinarios : null } };
  }

  async buscar(organizacion: string, consulta: string) {
    return this.prisma.procedimientos_veterinarios.findMany({ where: { fid_organizaciones: organizacion, eliminado_en: null, organizacion: { estado: 1, eliminado_en: null }, OR: [{ nombre: { contains: consulta, mode: Prisma.QueryMode.insensitive } }, { descripcion_guia: { contains: consulta, mode: Prisma.QueryMode.insensitive } }] }, orderBy: [{ created_at: "desc" }, { id_procedimientos_veterinarios: "desc" }], take: 6, select: this.seleccion });
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
