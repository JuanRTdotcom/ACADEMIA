import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../../../prisma/generated/client/client";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { PrismaService } from "../../../comun/prisma.service";
import type { DatosServicioPeluqueriaSpa, FiltrosServiciosPeluqueriaSpa } from "../../domain/entities/servicio-peluqueria-spa";

type Tx = Prisma.TransactionClient;
@Injectable()
export class FuenteDatosServiciosPeluqueriaSpaPrisma {
  constructor(private prisma: PrismaService, private auditoria: ServicioAuditoria) {}
  private conflicto(error: unknown): never { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("groomingServices.duplicate"); throw error; }
  private async contexto(tx: Tx, organizacion: string, usuario: string) {
    await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${organizacion}::uuid AND estado = 1 AND eliminado_en IS NULL FOR UPDATE`;
    const actor = await tx.usuarios.findFirst({ where: { id_usuarios: usuario, fid_organizaciones: organizacion, estado: 1, estado_cuenta: "activo", eliminado_en: null }, select: { id_usuarios: true } });
    if (!actor) throw new NotFoundException("groomingServices.unavailable");
  }
  private async existente(tx: Tx, id: string, organizacion: string) {
    await tx.$queryRaw`SELECT id_servicios_peluqueria_spa FROM nucleo.servicios_peluqueria_spa WHERE id_servicios_peluqueria_spa = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
    const servicio = await tx.servicios_peluqueria_spa.findFirst({ where: { id_servicios_peluqueria_spa: id, fid_organizaciones: organizacion, eliminado_en: null } });
    if (!servicio) throw new NotFoundException("groomingServices.notFound");
    return servicio;
  }
  private readonly seleccion = { id_servicios_peluqueria_spa: true, nombre: true, estado: true, created_at: true, updated_at: true } satisfies Prisma.servicios_peluqueria_spaSelect;
  async listar(organizacion: string, filtros: FiltrosServiciosPeluqueriaSpa) {
    const base = { fid_organizaciones: organizacion, eliminado_en: null, organizacion: { estado: 1, eliminado_en: null }, ...(filtros.consulta ? { nombre: { contains: filtros.consulta, mode: Prisma.QueryMode.insensitive } } : {}) };
    const cursorId = filtros.despues_de ?? filtros.antes_de; const cursor = cursorId ? await this.prisma.servicios_peluqueria_spa.findFirst({ where: { ...base, id_servicios_peluqueria_spa: cursorId }, select: { id_servicios_peluqueria_spa: true, created_at: true } }) : null;
    if (cursorId && !cursor) throw new BadRequestException("groomingServices.invalidCursor");
    const atras = Boolean(filtros.antes_de); const condicion = cursor ? { OR: atras ? [{ created_at: { gt: cursor.created_at } }, { created_at: cursor.created_at, id_servicios_peluqueria_spa: { gt: cursor.id_servicios_peluqueria_spa } }] : [{ created_at: { lt: cursor.created_at } }, { created_at: cursor.created_at, id_servicios_peluqueria_spa: { lt: cursor.id_servicios_peluqueria_spa } }] } : {};
    const [servicios, total] = await Promise.all([this.prisma.servicios_peluqueria_spa.findMany({ where: { ...base, ...condicion }, orderBy: atras ? [{ created_at: "asc" }, { id_servicios_peluqueria_spa: "asc" }] : [{ created_at: "desc" }, { id_servicios_peluqueria_spa: "desc" }], take: 11, select: this.seleccion }), this.prisma.servicios_peluqueria_spa.count({ where: base })]);
    const hayMas = servicios.length > 10; if (hayMas) servicios.pop(); if (atras) servicios.reverse();
    return { servicios, total, paginacion: { anterior: servicios.length && (atras ? hayMas : Boolean(filtros.despues_de)) ? servicios[0]!.id_servicios_peluqueria_spa : null, siguiente: servicios.length && (atras || hayMas) ? servicios.at(-1)!.id_servicios_peluqueria_spa : null } };
  }
  async buscar(organizacion: string, consulta: string) { return this.prisma.servicios_peluqueria_spa.findMany({ where: { fid_organizaciones: organizacion, eliminado_en: null, organizacion: { estado: 1, eliminado_en: null }, nombre: { contains: consulta, mode: Prisma.QueryMode.insensitive } }, orderBy: [{ created_at: "desc" }, { id_servicios_peluqueria_spa: "desc" }], take: 6, select: this.seleccion }); }
  async crear(organizacion: string, datos: DatosServicioPeluqueriaSpa, usuario: string, peticion: ContextoSolicitud) {
    try { return await this.prisma.$transaction(async (tx) => { await this.contexto(tx, organizacion, usuario); const servicio = await tx.servicios_peluqueria_spa.create({ data: { fid_organizaciones: organizacion, nombre: datos.nombre, created_by: usuario, updated_by: usuario }, select: { id_servicios_peluqueria_spa: true, nombre: true } }); await this.auditoria.registrar({ accion: "servicios_peluqueria_spa.creado", entidad: "servicios_peluqueria_spa", id_entidad: servicio.id_servicios_peluqueria_spa, fid_organizaciones: organizacion, fid_usuarios: usuario, peticion, metadatos: { nombre: servicio.nombre } }, tx); return servicio; }); } catch (error) { this.conflicto(error); }
  }
  async actualizar(id: string, organizacion: string, datos: DatosServicioPeluqueriaSpa, usuario: string, peticion: ContextoSolicitud) {
    try { await this.prisma.$transaction(async (tx) => { await this.contexto(tx, organizacion, usuario); const actual = await this.existente(tx, id, organizacion); if (actual.nombre === datos.nombre) throw new BadRequestException("groomingServices.noChanges"); await tx.servicios_peluqueria_spa.update({ where: { id_servicios_peluqueria_spa: id }, data: { nombre: datos.nombre, updated_by: usuario } }); await this.auditoria.registrar({ accion: "servicios_peluqueria_spa.modificado", entidad: "servicios_peluqueria_spa", id_entidad: id, fid_organizaciones: organizacion, fid_usuarios: usuario, peticion, metadatos: { anterior: actual.nombre, nuevo: datos.nombre } }, tx); }); } catch (error) { this.conflicto(error); }
  }
  async cambiarEstado(id: string, organizacion: string, activo: boolean, usuario: string, peticion: ContextoSolicitud) { await this.prisma.$transaction(async (tx) => { await this.contexto(tx, organizacion, usuario); const actual = await this.existente(tx, id, organizacion); const estado = activo ? 1 : 0; if (actual.estado === estado) throw new BadRequestException("groomingServices.noChanges"); await tx.servicios_peluqueria_spa.update({ where: { id_servicios_peluqueria_spa: id }, data: { estado, updated_by: usuario } }); await this.auditoria.registrar({ accion: activo ? "servicios_peluqueria_spa.activado" : "servicios_peluqueria_spa.desactivado", entidad: "servicios_peluqueria_spa", id_entidad: id, fid_organizaciones: organizacion, fid_usuarios: usuario, peticion, metadatos: { nombre: actual.nombre } }, tx); }); }
  async eliminar(id: string, organizacion: string, usuario: string, peticion: ContextoSolicitud) { await this.prisma.$transaction(async (tx) => { await this.contexto(tx, organizacion, usuario); const actual = await this.existente(tx, id, organizacion); await tx.$executeRaw`UPDATE nucleo.servicios_peluqueria_spa SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE id_servicios_peluqueria_spa = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL`; await this.auditoria.registrar({ accion: "servicios_peluqueria_spa.eliminado", entidad: "servicios_peluqueria_spa", id_entidad: id, fid_organizaciones: organizacion, fid_usuarios: usuario, peticion, metadatos: { nombre: actual.nombre } }, tx); }); }
}
