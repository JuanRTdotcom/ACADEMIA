import {
  BadRequestException,
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
  FiltrosServiciosVeterinaria,
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

  private readonly seleccion = {
    id_servicios_veterinaria: true,
    nombre: true,
    descripcion: true,
    precio: true,
    estado: true,
    created_at: true,
    updated_at: true,
  } satisfies Prisma.servicios_veterinariaSelect;

  private presentar(servicio: {
    id_servicios_veterinaria: string;
    nombre: string;
    descripcion: string | null;
    precio: Prisma.Decimal | null;
    estado: number;
    created_at: Date;
    updated_at: Date;
  }) {
    return { ...servicio, precio: servicio.precio?.toFixed(2) ?? null };
  }

  async listar(
    organizacion: string,
    filtros: FiltrosServiciosVeterinaria,
  ): Promise<CatalogoServiciosVeterinaria> {
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
      },
    });
    if (!empresa?.perfil?.moneda) {
      throw new NotFoundException("services.unavailable");
    }
    const cursorId = filtros.despues_de ?? filtros.antes_de;
    const cursor = cursorId
      ? await this.prisma.servicios_veterinaria.findFirst({
          where: {
            id_servicios_veterinaria: cursorId,
            fid_organizaciones: organizacion,
            eliminado_en: null,
            ...(filtros.consulta
              ? {
                  nombre: {
                    contains: filtros.consulta,
                    mode: Prisma.QueryMode.insensitive,
                  },
                }
              : {}),
          },
          select: { id_servicios_veterinaria: true, created_at: true },
        })
      : null;
    if (cursorId && !cursor)
      throw new BadRequestException("services.invalidCursor");

    const haciaAtras = Boolean(filtros.antes_de);
    const limite = 10;
    const condicionBase = {
      fid_organizaciones: organizacion,
      eliminado_en: null,
      ...(filtros.consulta
        ? {
            nombre: {
              contains: filtros.consulta,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    };
    const condicionCursor = cursor
      ? {
          OR: haciaAtras
            ? [
                { created_at: { gt: cursor.created_at } },
                {
                  created_at: cursor.created_at,
                  id_servicios_veterinaria: {
                    gt: cursor.id_servicios_veterinaria,
                  },
                },
              ]
            : [
                { created_at: { lt: cursor.created_at } },
                {
                  created_at: cursor.created_at,
                  id_servicios_veterinaria: {
                    lt: cursor.id_servicios_veterinaria,
                  },
                },
              ],
        }
      : {};
    const [filas, total] = await Promise.all([
      this.prisma.servicios_veterinaria.findMany({
        where: {
          ...condicionBase,
          ...condicionCursor,
        },
        orderBy: haciaAtras
          ? [{ created_at: "asc" }, { id_servicios_veterinaria: "asc" }]
          : [{ created_at: "desc" }, { id_servicios_veterinaria: "desc" }],
        take: limite + 1,
        select: this.seleccion,
      }),
      this.prisma.servicios_veterinaria.count({
        where: condicionBase,
      }),
    ]);
    const hayMas = filas.length > limite;
    if (hayMas) filas.pop();
    if (haciaAtras) filas.reverse();
    const servicios = filas.map((servicio) => this.presentar(servicio));
    return {
      servicios,
      moneda: empresa.perfil.moneda,
      total,
      paginacion: {
        anterior:
          servicios.length &&
          (haciaAtras ? hayMas : Boolean(filtros.despues_de))
            ? servicios[0]!.id_servicios_veterinaria
            : null,
        siguiente:
          servicios.length && (haciaAtras ? true : hayMas)
            ? servicios.at(-1)!.id_servicios_veterinaria
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
      throw new NotFoundException("services.unavailable");
    const servicios = await this.prisma.servicios_veterinaria.findMany({
      where: {
        fid_organizaciones: organizacion,
        eliminado_en: null,
        nombre: { contains: consulta, mode: "insensitive" },
      },
      orderBy: [{ created_at: "desc" }, { id_servicios_veterinaria: "desc" }],
      take: 6,
      select: this.seleccion,
    });
    return servicios.map((servicio) => this.presentar(servicio));
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
  }

  async actualizar(
    id: string,
    organizacion: string,
    datos: DatosServicioVeterinaria,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
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
  }

  async cambiarEstado(
    id: string,
    organizacion: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
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
