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
  CatalogoServiciosVeterinaria,
  DatosServicioVeterinaria,
} from "../../domain/entities/servicio-veterinaria";

type ClientePrisma = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosServiciosVeterinariaPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  private async validarContexto(
    tx: ClientePrisma,
    organizacion: string,
    usuario: string,
  ): Promise<void> {
    await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${organizacion}::uuid FOR UPDATE`;
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
    if (!actor) throw new NotFoundException("services.unavailable");
  }

  private async obtenerExistente(
    tx: ClientePrisma,
    id: string,
    organizacion: string,
  ) {
    await tx.$queryRaw`
      SELECT id_servicios_veterinaria
      FROM nucleo.servicios_veterinaria
      WHERE id_servicios_veterinaria = ${id}::uuid
        AND fid_organizaciones = ${organizacion}::uuid
        AND eliminado_en IS NULL
      FOR UPDATE
    `;
    const servicio = await tx.servicios_veterinaria.findFirst({
      where: {
        id_servicios_veterinaria: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
      },
    });
    if (!servicio) throw new NotFoundException("services.notFound");
    return servicio;
  }

  private relanzarConflicto(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("services.duplicate");
    }
    throw error;
  }

  async listar(organizacion: string): Promise<CatalogoServiciosVeterinaria> {
    const empresa = await this.prisma.organizaciones.findFirst({
      where: {
        id_organizaciones: organizacion,
        estado: 1,
        eliminado_en: null,
      },
      select: {
        perfil: {
          select: {
            moneda: {
              select: { id_parametros: true, codigo: true, etiqueta: true },
            },
          },
        },
        servicios_veterinaria: {
          where: { eliminado_en: null },
          orderBy: [
            { estado: "desc" },
            { nombre: "asc" },
            { id_servicios_veterinaria: "asc" },
          ],
          select: {
            id_servicios_veterinaria: true,
            nombre: true,
            descripcion: true,
            precio: true,
            estado: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
    if (!empresa?.perfil?.moneda) {
      throw new NotFoundException("services.unavailable");
    }
    const servicios = empresa.servicios_veterinaria.map((servicio) => ({
      ...servicio,
      precio: servicio.precio?.toFixed(2) ?? null,
    }));
    return {
      servicios,
      moneda: empresa.perfil.moneda,
      total: servicios.length,
    };
  }

  async obtener(id: string, organizacion: string) {
    const servicio = await this.prisma.servicios_veterinaria.findFirst({
      where: {
        id_servicios_veterinaria: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
        organizacion: { estado: 1, eliminado_en: null },
      },
      select: {
        id_servicios_veterinaria: true,
        nombre: true,
        descripcion: true,
        precio: true,
        estado: true,
        created_at: true,
        updated_at: true,
        organizacion: {
          select: {
            perfil: {
              select: {
                moneda: {
                  select: { id_parametros: true, codigo: true, etiqueta: true },
                },
              },
            },
          },
        },
      },
    });
    const moneda = servicio?.organizacion.perfil?.moneda;
    if (!servicio || !moneda) throw new NotFoundException("services.notFound");
    const datos = {
      id_servicios_veterinaria: servicio.id_servicios_veterinaria,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      precio: servicio.precio,
      estado: servicio.estado,
      created_at: servicio.created_at,
      updated_at: servicio.updated_at,
    };
    return {
      servicio: {
        ...datos,
        precio: datos.precio?.toFixed(2) ?? null,
      },
      moneda,
    };
  }

  async crear(
    organizacion: string,
    datos: DatosServicioVeterinaria,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarContexto(tx, organizacion, usuario);
        const servicio = await tx.servicios_veterinaria.create({
          data: {
            fid_organizaciones: organizacion,
            nombre: datos.nombre,
            descripcion: datos.descripcion,
            precio: datos.precio ? new Prisma.Decimal(datos.precio) : null,
            created_by: usuario,
            updated_by: usuario,
          },
          select: { id_servicios_veterinaria: true },
        });
        await this.auditoria.registrar(
          {
            accion: "servicios.creado",
            entidad: "servicios_veterinaria",
            id_entidad: servicio.id_servicios_veterinaria,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion: contexto,
            metadatos: { nombre: datos.nombre, precio: datos.precio },
          },
          tx,
        );
      });
    } catch (error) {
      this.relanzarConflicto(error);
    }
  }

  async actualizar(
    id: string,
    organizacion: string,
    datos: DatosServicioVeterinaria,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarContexto(tx, organizacion, usuario);
        const actual = await this.obtenerExistente(tx, id, organizacion);
        const precio = datos.precio ? new Prisma.Decimal(datos.precio) : null;
        const mismoPrecio =
          actual.precio === null
            ? precio === null
            : precio !== null && actual.precio.equals(precio);
        if (
          actual.nombre === datos.nombre &&
          actual.descripcion === datos.descripcion &&
          mismoPrecio
        ) {
          throw new BadRequestException("services.noChanges");
        }
        await tx.servicios_veterinaria.update({
          where: { id_servicios_veterinaria: id },
          data: {
            nombre: datos.nombre,
            descripcion: datos.descripcion,
            precio,
            updated_by: usuario,
          },
        });
        await this.auditoria.registrar(
          {
            accion: "servicios.modificado",
            entidad: "servicios_veterinaria",
            id_entidad: id,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion: contexto,
            metadatos: {
              anterior: {
                nombre: actual.nombre,
                descripcion: actual.descripcion,
                precio: actual.precio?.toFixed(2) ?? null,
              },
              nuevo: {
                nombre: datos.nombre,
                descripcion: datos.descripcion,
                precio: datos.precio,
              },
            },
          },
          tx,
        );
      });
    } catch (error) {
      this.relanzarConflicto(error);
    }
  }

  async cambiarEstado(
    id: string,
    organizacion: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarContexto(tx, organizacion, usuario);
        const actual = await this.obtenerExistente(tx, id, organizacion);
        const estado = activo ? 1 : 0;
        if (actual.estado === estado) {
          throw new BadRequestException("services.noChanges");
        }
        await tx.servicios_veterinaria.update({
          where: { id_servicios_veterinaria: id },
          data: { estado, updated_by: usuario },
        });
        await this.auditoria.registrar(
          {
            accion: activo ? "servicios.activado" : "servicios.desactivado",
            entidad: "servicios_veterinaria",
            id_entidad: id,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion: contexto,
            metadatos: { nombre: actual.nombre },
          },
          tx,
        );
      });
    } catch (error) {
      this.relanzarConflicto(error);
    }
  }

  async eliminar(
    id: string,
    organizacion: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.validarContexto(tx, organizacion, usuario);
      const actual = await this.obtenerExistente(tx, id, organizacion);
      await tx.$executeRaw`
        UPDATE nucleo.servicios_veterinaria
        SET estado = 0,
            eliminado_en = CURRENT_TIMESTAMP,
            eliminado_por = ${usuario}::uuid,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ${usuario}
        WHERE id_servicios_veterinaria = ${id}::uuid
          AND fid_organizaciones = ${organizacion}::uuid
          AND eliminado_en IS NULL
      `;
      await this.auditoria.registrar(
        {
          accion: "servicios.eliminado",
          entidad: "servicios_veterinaria",
          id_entidad: id,
          fid_organizaciones: organizacion,
          fid_usuarios: usuario,
          peticion: contexto,
          metadatos: {
            nombre: actual.nombre,
            descripcion: actual.descripcion,
            precio: actual.precio?.toFixed(2) ?? null,
          },
        },
        tx,
      );
    });
  }
}
