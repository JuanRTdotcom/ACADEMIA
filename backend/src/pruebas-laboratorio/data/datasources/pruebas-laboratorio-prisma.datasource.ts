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
import type { DatosPruebaLaboratorio, FiltrosPruebasLaboratorio } from "../../domain/entities/prueba-laboratorio";

type Tx = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosPruebasLaboratorioPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  private conflicto(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictException("laboratoryTests.duplicate");
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
    if (!actor) throw new NotFoundException("laboratoryTests.unavailable");
  }

  private async categoria(tx: Tx, id: string) {
    const categoria = await tx.categorias_pruebas_laboratorio.findFirst({
      where: { id_categorias_pruebas_laboratorio: id, estado: 1 },
      select: { id_categorias_pruebas_laboratorio: true, nombre: true },
    });
    if (!categoria)
      throw new BadRequestException("laboratoryTests.invalidCategory");
    return categoria;
  }

  private async existente(tx: Tx, id: string, organizacion: string) {
    await tx.$queryRaw`SELECT id_pruebas_laboratorio FROM nucleo.pruebas_laboratorio WHERE id_pruebas_laboratorio = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
    const prueba = await tx.pruebas_laboratorio.findFirst({
      where: {
        id_pruebas_laboratorio: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
      },
    });
    if (!prueba) throw new NotFoundException("laboratoryTests.notFound");
    return prueba;
  }

  private readonly seleccion = { id_pruebas_laboratorio: true, fid_categorias_pruebas_laboratorio: true, nombre: true, estado: true, created_at: true, updated_at: true, categoria: { select: { nombre: true } } } satisfies Prisma.pruebas_laboratorioSelect;

  async listar(organizacion: string, filtros: FiltrosPruebasLaboratorio) {
    const busqueda = filtros.consulta ? { AND: [{ OR: [{ nombre: { contains: filtros.consulta, mode: Prisma.QueryMode.insensitive } }, { categoria: { nombre: { contains: filtros.consulta, mode: Prisma.QueryMode.insensitive } } }] }] } : {};
    const base = { fid_organizaciones: organizacion, eliminado_en: null, organizacion: { estado: 1, eliminado_en: null }, ...busqueda };
    const cursorId = filtros.despues_de ?? filtros.antes_de;
    const cursor = cursorId ? await this.prisma.pruebas_laboratorio.findFirst({ where: { ...base, id_pruebas_laboratorio: cursorId }, select: { id_pruebas_laboratorio: true, created_at: true } }) : null;
    if (cursorId && !cursor) throw new BadRequestException("laboratoryTests.invalidCursor");
    const atras = Boolean(filtros.antes_de);
    const condicion = cursor ? { OR: atras ? [{ created_at: { gt: cursor.created_at } }, { created_at: cursor.created_at, id_pruebas_laboratorio: { gt: cursor.id_pruebas_laboratorio } }] : [{ created_at: { lt: cursor.created_at } }, { created_at: cursor.created_at, id_pruebas_laboratorio: { lt: cursor.id_pruebas_laboratorio } }] } : {};
    const [pruebas, total, categorias] = await Promise.all([
      this.prisma.pruebas_laboratorio.findMany({ where: { ...base, ...condicion }, orderBy: atras ? [{ created_at: "asc" }, { id_pruebas_laboratorio: "asc" }] : [{ created_at: "desc" }, { id_pruebas_laboratorio: "desc" }], take: 11, select: this.seleccion }),
      this.prisma.pruebas_laboratorio.count({ where: base }),
      this.prisma.categorias_pruebas_laboratorio.findMany({ where: { estado: 1 }, orderBy: [{ orden: "asc" }, { nombre: "asc" }], select: { id_categorias_pruebas_laboratorio: true, nombre: true } }),
    ]);
    const hayMas = pruebas.length > 10; if (hayMas) pruebas.pop(); if (atras) pruebas.reverse();
    return { pruebas, categorias, total, paginacion: { anterior: pruebas.length && (atras ? hayMas : Boolean(filtros.despues_de)) ? pruebas[0]!.id_pruebas_laboratorio : null, siguiente: pruebas.length && (atras || hayMas) ? pruebas.at(-1)!.id_pruebas_laboratorio : null } };
  }

  async buscar(organizacion: string, consulta: string) {
    return this.prisma.pruebas_laboratorio.findMany({ where: { fid_organizaciones: organizacion, eliminado_en: null, organizacion: { estado: 1, eliminado_en: null }, OR: [{ nombre: { contains: consulta, mode: Prisma.QueryMode.insensitive } }, { categoria: { nombre: { contains: consulta, mode: Prisma.QueryMode.insensitive } } }] }, orderBy: [{ created_at: "desc" }, { id_pruebas_laboratorio: "desc" }], take: 6, select: this.seleccion });
  }

  async crear(
    organizacion: string,
    datos: DatosPruebaLaboratorio,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const categoria = await this.categoria(
          tx,
          datos.fid_categorias_pruebas_laboratorio,
        );
        const prueba = await tx.pruebas_laboratorio.create({
          data: {
            fid_organizaciones: organizacion,
            ...datos,
            created_by: usuario,
            updated_by: usuario,
          },
          select: {
            id_pruebas_laboratorio: true,
            fid_categorias_pruebas_laboratorio: true,
            nombre: true,
          },
        });
        await this.auditoria.registrar(
          {
            accion: "pruebas_laboratorio.creada",
            entidad: "pruebas_laboratorio",
            id_entidad: prueba.id_pruebas_laboratorio,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion,
            metadatos: { nombre: prueba.nombre, categoria: categoria.nombre },
          },
          tx,
        );
        return prueba;
      });
    } catch (error) {
      this.conflicto(error);
    }
  }

  async actualizar(
    id: string,
    organizacion: string,
    datos: DatosPruebaLaboratorio,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const actual = await this.existente(tx, id, organizacion);
        await this.categoria(tx, datos.fid_categorias_pruebas_laboratorio);
        if (
          actual.nombre === datos.nombre &&
          actual.fid_categorias_pruebas_laboratorio ===
            datos.fid_categorias_pruebas_laboratorio
        )
          throw new BadRequestException("laboratoryTests.noChanges");
        await tx.pruebas_laboratorio.update({
          where: { id_pruebas_laboratorio: id },
          data: { ...datos, updated_by: usuario },
        });
        await this.auditoria.registrar(
          {
            accion: "pruebas_laboratorio.modificada",
            entidad: "pruebas_laboratorio",
            id_entidad: id,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion,
            metadatos: {
              anterior: {
                nombre: actual.nombre,
                categoria: actual.fid_categorias_pruebas_laboratorio,
              },
              nuevo: {
                nombre: datos.nombre,
                categoria: datos.fid_categorias_pruebas_laboratorio,
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
        throw new BadRequestException("laboratoryTests.noChanges");
      await tx.pruebas_laboratorio.update({
        where: { id_pruebas_laboratorio: id },
        data: { estado, updated_by: usuario },
      });
      await this.auditoria.registrar(
        {
          accion: activo
            ? "pruebas_laboratorio.activada"
            : "pruebas_laboratorio.desactivada",
          entidad: "pruebas_laboratorio",
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
      await tx.$executeRaw`UPDATE nucleo.pruebas_laboratorio SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE id_pruebas_laboratorio = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL`;
      await this.auditoria.registrar(
        {
          accion: "pruebas_laboratorio.eliminada",
          entidad: "pruebas_laboratorio",
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
