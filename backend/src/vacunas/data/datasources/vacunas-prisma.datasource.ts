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
import type {
  CatalogoVacunas,
  DatosVacuna,
  FiltrosVacunas,
} from "../../domain/entities/vacuna";

type Tx = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosVacunasPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  private conflicto(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictException("vaccines.duplicate");
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
        organizacion: { estado: 1, eliminado_en: null },
      },
      select: { id_usuarios: true },
    });
    if (!actor) throw new NotFoundException("vaccines.unavailable");
  }

  private async existente(tx: Tx, id: string, organizacion: string) {
    await tx.$queryRaw`SELECT id_vacunas FROM nucleo.vacunas WHERE id_vacunas = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
    const vacuna = await tx.vacunas.findFirst({
      where: {
        id_vacunas: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
      },
    });
    if (!vacuna) throw new NotFoundException("vaccines.notFound");
    return vacuna;
  }

  private readonly seleccion = {
    id_vacunas: true,
    nombre: true,
    estado: true,
    created_at: true,
    updated_at: true,
  } satisfies Prisma.vacunasSelect;

  async listar(
    organizacion: string,
    filtros: FiltrosVacunas,
  ): Promise<CatalogoVacunas> {
    const organizacionActiva = await this.prisma.organizaciones.findFirst({
      where: { id_organizaciones: organizacion, estado: 1, eliminado_en: null },
      select: { id_organizaciones: true },
    });
    if (!organizacionActiva)
      throw new NotFoundException("vaccines.unavailable");
    const cursorId = filtros.despues_de ?? filtros.antes_de;
    const filtroNombre = filtros.consulta
      ? {
          nombre: {
            contains: filtros.consulta,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {};
    const cursor = cursorId
      ? await this.prisma.vacunas.findFirst({
          where: {
            id_vacunas: cursorId,
            fid_organizaciones: organizacion,
            eliminado_en: null,
            ...filtroNombre,
          },
          select: { id_vacunas: true, created_at: true },
        })
      : null;
    if (cursorId && !cursor)
      throw new BadRequestException("vaccines.invalidCursor");
    const haciaAtras = Boolean(filtros.antes_de);
    const limite = 10;
    const condicionBase = {
      fid_organizaciones: organizacion,
      eliminado_en: null,
      ...filtroNombre,
    };
    const condicionCursor = cursor
      ? {
          OR: haciaAtras
            ? [
                { created_at: { gt: cursor.created_at } },
                {
                  created_at: cursor.created_at,
                  id_vacunas: { gt: cursor.id_vacunas },
                },
              ]
            : [
                { created_at: { lt: cursor.created_at } },
                {
                  created_at: cursor.created_at,
                  id_vacunas: { lt: cursor.id_vacunas },
                },
              ],
        }
      : {};
    const [filas, total] = await Promise.all([
      this.prisma.vacunas.findMany({
        where: { ...condicionBase, ...condicionCursor },
        orderBy: haciaAtras
          ? [{ created_at: "asc" }, { id_vacunas: "asc" }]
          : [{ created_at: "desc" }, { id_vacunas: "desc" }],
        take: limite + 1,
        select: this.seleccion,
      }),
      this.prisma.vacunas.count({ where: condicionBase }),
    ]);
    const hayMas = filas.length > limite;
    if (hayMas) filas.pop();
    if (haciaAtras) filas.reverse();
    return {
      vacunas: filas,
      total,
      paginacion: {
        anterior:
          filas.length && (haciaAtras ? hayMas : Boolean(filtros.despues_de))
            ? filas[0]!.id_vacunas
            : null,
        siguiente:
          filas.length && (haciaAtras ? true : hayMas)
            ? filas.at(-1)!.id_vacunas
            : null,
      },
    };
  }

  async buscar(organizacion: string, consulta: string) {
    const organizacionActiva = await this.prisma.organizaciones.findFirst({
      where: { id_organizaciones: organizacion, estado: 1, eliminado_en: null },
      select: { id_organizaciones: true },
    });
    if (!organizacionActiva)
      throw new NotFoundException("vaccines.unavailable");
    return this.prisma.vacunas.findMany({
      where: {
        fid_organizaciones: organizacion,
        eliminado_en: null,
        nombre: { contains: consulta, mode: Prisma.QueryMode.insensitive },
      },
      orderBy: [{ created_at: "desc" }, { id_vacunas: "desc" }],
      take: 6,
      select: this.seleccion,
    });
  }

  async crear(
    organizacion: string,
    datos: DatosVacuna,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const vacuna = await tx.vacunas.create({
          data: {
            fid_organizaciones: organizacion,
            nombre: datos.nombre,
            created_by: usuario,
            updated_by: usuario,
          },
          select: { id_vacunas: true, nombre: true },
        });
        await this.auditoria.registrar(
          {
            accion: "vacunas.creada",
            entidad: "vacunas",
            id_entidad: vacuna.id_vacunas,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion,
            metadatos: { nombre: vacuna.nombre },
          },
          tx,
        );
        return vacuna;
      });
    } catch (error) {
      this.conflicto(error);
    }
  }

  async actualizar(
    id: string,
    organizacion: string,
    datos: DatosVacuna,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const actual = await this.existente(tx, id, organizacion);
        if (actual.nombre === datos.nombre)
          throw new BadRequestException("vaccines.noChanges");
        await tx.vacunas.update({
          where: { id_vacunas: id },
          data: { nombre: datos.nombre, updated_by: usuario },
        });
        await this.auditoria.registrar(
          {
            accion: "vacunas.modificada",
            entidad: "vacunas",
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
        throw new BadRequestException("vaccines.noChanges");
      await tx.vacunas.update({
        where: { id_vacunas: id },
        data: { estado, updated_by: usuario },
      });
      await this.auditoria.registrar(
        {
          accion: activo ? "vacunas.activada" : "vacunas.desactivada",
          entidad: "vacunas",
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
      await tx.$executeRaw`UPDATE nucleo.vacunas SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE id_vacunas = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL`;
      await this.auditoria.registrar(
        {
          accion: "vacunas.eliminada",
          entidad: "vacunas",
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
