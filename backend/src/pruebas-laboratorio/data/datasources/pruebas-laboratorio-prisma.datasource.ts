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
import type { DatosPruebaLaboratorio } from "../../domain/entities/prueba-laboratorio";

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

  async listar(organizacion: string) {
    const [pruebas, categorias] = await Promise.all([
      this.prisma.pruebas_laboratorio.findMany({
        where: {
          fid_organizaciones: organizacion,
          eliminado_en: null,
          organizacion: { estado: 1, eliminado_en: null },
        },
        orderBy: [{ created_at: "desc" }, { id_pruebas_laboratorio: "desc" }],
        select: {
          id_pruebas_laboratorio: true,
          fid_categorias_pruebas_laboratorio: true,
          nombre: true,
          estado: true,
          created_at: true,
          updated_at: true,
          categoria: { select: { nombre: true } },
        },
      }),
      this.prisma.categorias_pruebas_laboratorio.findMany({
        where: { estado: 1 },
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
        select: { id_categorias_pruebas_laboratorio: true, nombre: true },
      }),
    ]);
    return { pruebas, categorias, total: pruebas.length };
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
