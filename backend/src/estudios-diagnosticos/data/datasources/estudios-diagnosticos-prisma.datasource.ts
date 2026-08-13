import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../../../prisma/generated/client/client";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { PrismaService } from "../../../comun/prisma.service";
import type { DatosEstudioDiagnostico, FiltrosEstudiosDiagnosticos } from "../../domain/entities/estudio-diagnostico";

type Tx = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosEstudiosDiagnosticosPrisma {
  constructor(private prisma: PrismaService, private auditoria: ServicioAuditoria) {}

  private conflicto(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new ConflictException("diagnosticStudies.duplicate");
    throw error;
  }

  private async contexto(tx: Tx, organizacion: string, usuario: string) {
    await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${organizacion}::uuid AND estado = 1 AND eliminado_en IS NULL FOR UPDATE`;
    const actor = await tx.usuarios.findFirst({ where: { id_usuarios: usuario, fid_organizaciones: organizacion, estado: 1, estado_cuenta: "activo", eliminado_en: null }, select: { id_usuarios: true } });
    if (!actor) throw new NotFoundException("diagnosticStudies.unavailable");
  }

  private async existente(tx: Tx, id: string, organizacion: string) {
    await tx.$queryRaw`SELECT id_estudios_diagnosticos FROM nucleo.estudios_diagnosticos WHERE id_estudios_diagnosticos = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
    const estudio = await tx.estudios_diagnosticos.findFirst({ where: { id_estudios_diagnosticos: id, fid_organizaciones: organizacion, eliminado_en: null } });
    if (!estudio) throw new NotFoundException("diagnosticStudies.notFound");
    return estudio;
  }

  private readonly seleccion = { id_estudios_diagnosticos: true, nombre: true, estado: true, created_at: true, updated_at: true } satisfies Prisma.estudios_diagnosticosSelect;
  async listar(organizacion: string, filtros: FiltrosEstudiosDiagnosticos) {
    const base = { fid_organizaciones: organizacion, eliminado_en: null, organizacion: { estado: 1, eliminado_en: null }, ...(filtros.consulta ? { nombre: { contains: filtros.consulta, mode: Prisma.QueryMode.insensitive } } : {}) };
    const cursorId = filtros.despues_de ?? filtros.antes_de;
    const cursor = cursorId ? await this.prisma.estudios_diagnosticos.findFirst({ where: { ...base, id_estudios_diagnosticos: cursorId }, select: { id_estudios_diagnosticos: true, created_at: true } }) : null;
    if (cursorId && !cursor) throw new BadRequestException("diagnosticStudies.invalidCursor");
    const atras = Boolean(filtros.antes_de); const condicion = cursor ? { OR: atras ? [{ created_at: { gt: cursor.created_at } }, { created_at: cursor.created_at, id_estudios_diagnosticos: { gt: cursor.id_estudios_diagnosticos } }] : [{ created_at: { lt: cursor.created_at } }, { created_at: cursor.created_at, id_estudios_diagnosticos: { lt: cursor.id_estudios_diagnosticos } }] } : {};
    const [estudios, total] = await Promise.all([this.prisma.estudios_diagnosticos.findMany({ where: { ...base, ...condicion }, orderBy: atras ? [{ created_at: "asc" }, { id_estudios_diagnosticos: "asc" }] : [{ created_at: "desc" }, { id_estudios_diagnosticos: "desc" }], take: 11, select: this.seleccion }), this.prisma.estudios_diagnosticos.count({ where: base })]);
    const hayMas = estudios.length > 10; if (hayMas) estudios.pop(); if (atras) estudios.reverse();
    return { estudios, total, paginacion: { anterior: estudios.length && (atras ? hayMas : Boolean(filtros.despues_de)) ? estudios[0]!.id_estudios_diagnosticos : null, siguiente: estudios.length && (atras || hayMas) ? estudios.at(-1)!.id_estudios_diagnosticos : null } };
  }
  async buscar(organizacion: string, consulta: string) { return this.prisma.estudios_diagnosticos.findMany({ where: { fid_organizaciones: organizacion, eliminado_en: null, organizacion: { estado: 1, eliminado_en: null }, nombre: { contains: consulta, mode: Prisma.QueryMode.insensitive } }, orderBy: [{ created_at: "desc" }, { id_estudios_diagnosticos: "desc" }], take: 6, select: this.seleccion }); }

  async crear(organizacion: string, datos: DatosEstudioDiagnostico, usuario: string, peticion: ContextoSolicitud) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const estudio = await tx.estudios_diagnosticos.create({ data: { fid_organizaciones: organizacion, nombre: datos.nombre, created_by: usuario, updated_by: usuario }, select: { id_estudios_diagnosticos: true, nombre: true } });
        await this.auditoria.registrar({ accion: "estudios_diagnosticos.creado", entidad: "estudios_diagnosticos", id_entidad: estudio.id_estudios_diagnosticos, fid_organizaciones: organizacion, fid_usuarios: usuario, peticion, metadatos: { nombre: estudio.nombre } }, tx);
        return estudio;
      });
    } catch (error) { this.conflicto(error); }
  }

  async actualizar(id: string, organizacion: string, datos: DatosEstudioDiagnostico, usuario: string, peticion: ContextoSolicitud) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const actual = await this.existente(tx, id, organizacion);
        if (actual.nombre === datos.nombre) throw new BadRequestException("diagnosticStudies.noChanges");
        await tx.estudios_diagnosticos.update({ where: { id_estudios_diagnosticos: id }, data: { nombre: datos.nombre, updated_by: usuario } });
        await this.auditoria.registrar({ accion: "estudios_diagnosticos.modificado", entidad: "estudios_diagnosticos", id_entidad: id, fid_organizaciones: organizacion, fid_usuarios: usuario, peticion, metadatos: { anterior: actual.nombre, nuevo: datos.nombre } }, tx);
      });
    } catch (error) { this.conflicto(error); }
  }

  async cambiarEstado(id: string, organizacion: string, activo: boolean, usuario: string, peticion: ContextoSolicitud) {
    await this.prisma.$transaction(async (tx) => {
      await this.contexto(tx, organizacion, usuario);
      const actual = await this.existente(tx, id, organizacion);
      const estado = activo ? 1 : 0;
      if (actual.estado === estado) throw new BadRequestException("diagnosticStudies.noChanges");
      await tx.estudios_diagnosticos.update({ where: { id_estudios_diagnosticos: id }, data: { estado, updated_by: usuario } });
      await this.auditoria.registrar({ accion: activo ? "estudios_diagnosticos.activado" : "estudios_diagnosticos.desactivado", entidad: "estudios_diagnosticos", id_entidad: id, fid_organizaciones: organizacion, fid_usuarios: usuario, peticion, metadatos: { nombre: actual.nombre } }, tx);
    });
  }

  async eliminar(id: string, organizacion: string, usuario: string, peticion: ContextoSolicitud) {
    await this.prisma.$transaction(async (tx) => {
      await this.contexto(tx, organizacion, usuario);
      const actual = await this.existente(tx, id, organizacion);
      await tx.$executeRaw`UPDATE nucleo.estudios_diagnosticos SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE id_estudios_diagnosticos = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL`;
      await this.auditoria.registrar({ accion: "estudios_diagnosticos.eliminado", entidad: "estudios_diagnosticos", id_entidad: id, fid_organizaciones: organizacion, fid_usuarios: usuario, peticion, metadatos: { nombre: actual.nombre } }, tx);
    });
  }
}
