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
  CatalogoMotivosConsulta,
  DatosMotivoConsulta,
  FiltrosMotivosConsulta,
} from "../../domain/entities/motivo-consulta";

type Tx = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosMotivosConsultaPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  private conflicto(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictException("consultationReasons.duplicate");
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
    if (!actor) throw new NotFoundException("consultationReasons.unavailable");
  }

  private async existente(tx: Tx, id: string, organizacion: string) {
    await tx.$queryRaw`SELECT id_motivos_consulta FROM nucleo.motivos_consulta WHERE id_motivos_consulta = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
    const motivo = await tx.motivos_consulta.findFirst({
      where: {
        id_motivos_consulta: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
      },
    });
    if (!motivo) throw new NotFoundException("consultationReasons.notFound");
    return motivo;
  }

  private readonly seleccion = {
    id_motivos_consulta: true,
    nombre: true,
    descripcion: true,
    estado: true,
    created_at: true,
    updated_at: true,
  } satisfies Prisma.motivos_consultaSelect;

  async listar(
    organizacion: string,
    filtros: FiltrosMotivosConsulta,
  ): Promise<CatalogoMotivosConsulta> {
    const organizacionActiva = await this.prisma.organizaciones.findFirst({
      where: { id_organizaciones: organizacion, estado: 1, eliminado_en: null },
      select: { id_organizaciones: true },
    });
    if (!organizacionActiva)
      throw new NotFoundException("consultationReasons.unavailable");

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
      ? await this.prisma.motivos_consulta.findFirst({
          where: {
            id_motivos_consulta: cursorId,
            fid_organizaciones: organizacion,
            eliminado_en: null,
            ...filtroNombre,
          },
          select: { id_motivos_consulta: true, created_at: true },
        })
      : null;
    if (cursorId && !cursor)
      throw new BadRequestException("consultationReasons.invalidCursor");

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
                  id_motivos_consulta: { gt: cursor.id_motivos_consulta },
                },
              ]
            : [
                { created_at: { lt: cursor.created_at } },
                {
                  created_at: cursor.created_at,
                  id_motivos_consulta: { lt: cursor.id_motivos_consulta },
                },
              ],
        }
      : {};
    const [filas, total] = await Promise.all([
      this.prisma.motivos_consulta.findMany({
        where: { ...condicionBase, ...condicionCursor },
        orderBy: haciaAtras
          ? [{ created_at: "asc" }, { id_motivos_consulta: "asc" }]
          : [{ created_at: "desc" }, { id_motivos_consulta: "desc" }],
        take: limite + 1,
        select: this.seleccion,
      }),
      this.prisma.motivos_consulta.count({ where: condicionBase }),
    ]);
    const hayMas = filas.length > limite;
    if (hayMas) filas.pop();
    if (haciaAtras) filas.reverse();
    return {
      motivos: filas,
      total,
      paginacion: {
        anterior:
          filas.length && (haciaAtras ? hayMas : Boolean(filtros.despues_de))
            ? filas[0]!.id_motivos_consulta
            : null,
        siguiente:
          filas.length && (haciaAtras ? true : hayMas)
            ? filas.at(-1)!.id_motivos_consulta
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
      throw new NotFoundException("consultationReasons.unavailable");
    return this.prisma.motivos_consulta.findMany({
      where: {
        fid_organizaciones: organizacion,
        eliminado_en: null,
        nombre: { contains: consulta, mode: Prisma.QueryMode.insensitive },
      },
      orderBy: [{ created_at: "desc" }, { id_motivos_consulta: "desc" }],
      take: 6,
      select: this.seleccion,
    });
  }

  async crear(
    organizacion: string,
    datos: DatosMotivoConsulta,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const motivo = await tx.motivos_consulta.create({
          data: {
            fid_organizaciones: organizacion,
            ...datos,
            created_by: usuario,
            updated_by: usuario,
          },
          select: {
            id_motivos_consulta: true,
            nombre: true,
            descripcion: true,
          },
        });
        await this.auditoria.registrar(
          {
            accion: "motivos_consulta.creado",
            entidad: "motivos_consulta",
            id_entidad: motivo.id_motivos_consulta,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion,
            metadatos: { nombre: datos.nombre },
          },
          tx,
        );
        return motivo;
      });
    } catch (error) {
      this.conflicto(error);
    }
  }

  async actualizar(
    id: string,
    organizacion: string,
    datos: DatosMotivoConsulta,
    usuario: string,
    peticion: ContextoSolicitud,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.contexto(tx, organizacion, usuario);
        const actual = await this.existente(tx, id, organizacion);
        if (
          actual.nombre === datos.nombre &&
          actual.descripcion === datos.descripcion
        )
          throw new BadRequestException("consultationReasons.noChanges");
        await tx.motivos_consulta.update({
          where: { id_motivos_consulta: id },
          data: { ...datos, updated_by: usuario },
        });
        await this.auditoria.registrar(
          {
            accion: "motivos_consulta.modificado",
            entidad: "motivos_consulta",
            id_entidad: id,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion,
            metadatos: {
              anterior: {
                nombre: actual.nombre,
                descripcion: actual.descripcion,
              },
              nuevo: {
                nombre: datos.nombre,
                descripcion: datos.descripcion ?? null,
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
        throw new BadRequestException("consultationReasons.noChanges");
      await tx.motivos_consulta.update({
        where: { id_motivos_consulta: id },
        data: { estado, updated_by: usuario },
      });
      await this.auditoria.registrar(
        {
          accion: activo
            ? "motivos_consulta.activado"
            : "motivos_consulta.desactivado",
          entidad: "motivos_consulta",
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
      await tx.$executeRaw`UPDATE nucleo.motivos_consulta SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE id_motivos_consulta = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL`;
      await this.auditoria.registrar(
        {
          accion: "motivos_consulta.eliminado",
          entidad: "motivos_consulta",
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
