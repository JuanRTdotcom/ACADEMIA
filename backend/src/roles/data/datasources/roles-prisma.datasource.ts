import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../../../prisma/generated/client/client";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import { PrismaService } from "../../../comun/prisma.service";
import type {
  CatalogoPermisosRol,
  DatosRol,
  RolListado,
} from "../../domain/entities/rol";

type ClientePrisma = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosRolesPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  /** Toda mutación revalida usuario y tenant dentro de su propia transacción. */
  private async validarContexto(
    tx: ClientePrisma,
    idOrganizacion: string,
    idUsuario: string,
  ): Promise<void> {
    const usuario = await tx.usuarios.findFirst({
      where: {
        id_usuarios: idUsuario,
        fid_organizaciones: idOrganizacion,
        estado: 1,
        estado_cuenta: "activo",
        organizacion: { estado: 1, eliminado_en: null },
      },
      select: { id_usuarios: true },
    });
    if (!usuario) throw new NotFoundException("roles.unavailable");
  }

  private conflicto(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("roles.duplicate");
    }
    throw error;
  }

  async listar(
    idOrganizacion: string,
  ): Promise<{ roles: RolListado[]; total: number }> {
    const organizacion = await this.prisma.organizaciones.findFirst({
      where: {
        id_organizaciones: idOrganizacion,
        estado: 1,
        eliminado_en: null,
      },
      select: { id_organizaciones: true },
    });
    if (!organizacion) throw new NotFoundException("roles.unavailable");
    const roles = await this.prisma.roles.findMany({
      where: { eliminado_en: null },
      orderBy: [{ created_at: "desc" }, { id_roles: "desc" }],
      select: {
        id_roles: true,
        nombre: true,
        codigo: true,
        descripcion: true,
        icono: true,
        estado: true,
        created_at: true,
      },
    });
    return {
      roles: roles.map(({ codigo, icono, ...rol }) => ({
        ...rol,
        alias: codigo,
        icono: icono as DatosRol["icono"],
      })),
      total: roles.length,
    };
  }

  /**
   * Lee únicamente permisos y módulos activos. El campo `asignado` refleja la
   * base actual; la selección de la interfaz aún es solo local, sin mutación.
   */
  async catalogoPermisos(
    idRol: string,
    idOrganizacion: string,
  ): Promise<CatalogoPermisosRol> {
    const rol = await this.prisma.roles.findFirst({
      where: {
        id_roles: idRol,
        eliminado_en: null,
      },
      select: {
        id_roles: true,
        nombre: true,
        codigo: true,
        icono: true,
        estado: true,
      },
    });
    if (!rol) throw new NotFoundException("roles.notFound");

    const modulos = await this.prisma.modulos.findMany({
      where: { estado: 1, permisos: { some: { estado: 1 } } },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: {
        id_modulos: true,
        codigo: true,
        nombre: true,
        icono: true,
        ruta: true,
        permisos: {
          where: { estado: 1 },
          orderBy: { accion: "asc" },
          select: {
            id_permisos: true,
            codigo: true,
            accion: true,
            descripcion: true,
            roles_permisos: {
              where: { fid_roles: idRol, estado: 1 },
              select: { id_roles_permisos: true },
            },
          },
        },
      },
    });

    return {
      rol: {
        id_roles: rol.id_roles,
        nombre: rol.nombre,
        alias: rol.codigo,
        icono: rol.icono as DatosRol["icono"],
        estado: rol.estado,
      },
      modulos: modulos.map((modulo) => ({
        ...modulo,
        permisos: modulo.permisos.map(({ roles_permisos, ...permiso }) => ({
          ...permiso,
          asignado: roles_permisos.length > 0,
        })),
      })),
    };
  }

  /**
   * Sincroniza conjunto completo de permisos. No borra filas: desactiva las que
   * salen y reactiva/crea las seleccionadas, todo junto con auditoría.
   */
  async guardarPermisos(
    idRol: string,
    idsPermisos: string[],
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.validarContexto(tx, idOrganizacion, idUsuario);
      await tx.$queryRaw`SELECT id_roles FROM seguridad.roles WHERE id_roles = ${idRol}::uuid FOR UPDATE`;
      const rol = await tx.roles.findFirst({
        where: {
          id_roles: idRol,
          eliminado_en: null,
          estado: 1,
        },
        select: { id_roles: true, nombre: true, codigo: true },
      });
      if (!rol) throw new NotFoundException("roles.notFound");

      const solicitados = [...new Set(idsPermisos)];
      const permisos = solicitados.length
        ? await tx.permisos.findMany({
            where: { id_permisos: { in: solicitados }, estado: 1 },
            select: { id_permisos: true, codigo: true },
          })
        : [];
      // No se acepta un UUID inexistente, inactivo o ajeno al catálogo vigente.
      if (permisos.length !== solicitados.length) {
        throw new BadRequestException("roles.invalidPermissions");
      }

      const actuales = await tx.roles_permisos.findMany({
        where: { fid_roles: idRol, estado: 1 },
        select: { id_roles_permisos: true, fid_permisos: true, permiso: { select: { codigo: true } } },
      });
      const actualesIds = new Set(actuales.map((item) => item.fid_permisos));
      const solicitadosIds = new Set(solicitados);
      const agregar = permisos.filter((item) => !actualesIds.has(item.id_permisos));
      const retirar = actuales.filter((item) => !solicitadosIds.has(item.fid_permisos));
      if (agregar.length === 0 && retirar.length === 0) {
        throw new BadRequestException("roles.noChanges");
      }

      if (retirar.length) {
        await tx.roles_permisos.updateMany({
          where: { id_roles_permisos: { in: retirar.map((item) => item.id_roles_permisos) } },
          data: { estado: 0, updated_by: idUsuario },
        });
      }
      for (const permiso of agregar) {
        await tx.roles_permisos.upsert({
          where: { fid_roles_fid_permisos: { fid_roles: idRol, fid_permisos: permiso.id_permisos } },
          update: { estado: 1, updated_by: idUsuario },
          create: { fid_roles: idRol, fid_permisos: permiso.id_permisos, estado: 1, created_by: idUsuario, updated_by: idUsuario },
        });
      }
      await tx.$executeRaw`UPDATE seguridad.roles SET updated_at = CURRENT_TIMESTAMP, updated_by = ${idUsuario} WHERE id_roles = ${idRol}::uuid`;
      await this.auditoria.registrar(
        {
          accion: "roles.permisos_actualizados",
          entidad: "roles",
          id_entidad: idRol,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuario,
          peticion: contexto,
          metadatos: {
            rol: { nombre: rol.nombre, alias: rol.codigo },
            agregados: agregar.map((item) => item.codigo),
            retirados: retirar.map((item) => item.permiso.codigo),
            total: solicitados.length,
          },
        },
        tx,
      );
    });
  }

  async crear(
    datos: DatosRol,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarContexto(tx, idOrganizacion, idUsuario);
        const duplicado = await tx.roles.findFirst({
          where: {
            eliminado_en: null,
            OR: [
              { codigo: datos.alias },
              { nombre: { equals: datos.nombre, mode: "insensitive" } },
            ],
          },
          select: { id_roles: true },
        });
        if (duplicado) throw new ConflictException("roles.duplicate");
        const rol = await tx.roles.create({
          data: {
            codigo: datos.alias,
            nombre: datos.nombre,
            descripcion: datos.descripcion,
            icono: datos.icono,
            estado: 1,
            created_by: idUsuario,
            updated_by: idUsuario,
          },
          select: { id_roles: true },
        });
        await this.auditoria.registrar(
          {
            accion: "roles.creado",
            entidad: "roles",
            id_entidad: rol.id_roles,
            fid_organizaciones: idOrganizacion,
            fid_usuarios: idUsuario,
            peticion: contexto,
            metadatos: {
              nombre: datos.nombre,
              alias: datos.alias,
              descripcion: datos.descripcion,
              icono: datos.icono,
            },
          },
          tx,
        );
      });
    } catch (error) {
      this.conflicto(error);
    }
  }

  async actualizar(
    idRol: string,
    datos: DatosRol,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarContexto(tx, idOrganizacion, idUsuario);
        await tx.$queryRaw`SELECT id_roles FROM seguridad.roles WHERE id_roles = ${idRol}::uuid FOR UPDATE`;
        const actual = await tx.roles.findFirst({
          where: {
            id_roles: idRol,
          },
          select: {
            codigo: true,
            nombre: true,
            descripcion: true,
            icono: true,
            estado: true,
            eliminado_en: true,
          },
        });
        if (!actual) throw new NotFoundException("roles.notFound");
        if (actual.eliminado_en) {
          throw new ConflictException("roles.alreadyDeleted");
        }
        if (actual.estado !== 1) {
          throw new ConflictException("roles.inactiveEdit");
        }
        const duplicado = await tx.roles.findFirst({
          where: {
            id_roles: { not: idRol },
            eliminado_en: null,
            OR: [
              { codigo: datos.alias },
              { nombre: { equals: datos.nombre, mode: "insensitive" } },
            ],
          },
          select: { id_roles: true },
        });
        if (duplicado) throw new ConflictException("roles.duplicate");
        if (
          actual.codigo === datos.alias &&
          actual.nombre === datos.nombre &&
          actual.descripcion === datos.descripcion &&
          actual.icono === datos.icono
        ) {
          throw new BadRequestException("roles.noChanges");
        }
        await tx.roles.update({
          where: { id_roles: idRol },
          data: {
            codigo: datos.alias,
            nombre: datos.nombre,
            descripcion: datos.descripcion,
            icono: datos.icono,
            updated_by: idUsuario,
          },
        });
        await tx.$executeRaw`UPDATE seguridad.roles SET updated_at = CURRENT_TIMESTAMP WHERE id_roles = ${idRol}::uuid`;
        await this.auditoria.registrar(
          {
            accion: "roles.modificado",
            entidad: "roles",
            id_entidad: idRol,
            fid_organizaciones: idOrganizacion,
            fid_usuarios: idUsuario,
            peticion: contexto,
            metadatos: {
              anterior: {
                nombre: actual.nombre,
                alias: actual.codigo,
                descripcion: actual.descripcion,
                icono: actual.icono,
              },
              nuevo: {
                nombre: datos.nombre,
                alias: datos.alias,
                descripcion: datos.descripcion,
                icono: datos.icono,
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
    idRol: string,
    activo: boolean,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.validarContexto(tx, idOrganizacion, idUsuario);
      await tx.$queryRaw`SELECT id_roles FROM seguridad.roles WHERE id_roles = ${idRol}::uuid FOR UPDATE`;
      const rol = await tx.roles.findFirst({
        where: {
          id_roles: idRol,
        },
        select: {
          nombre: true,
          codigo: true,
          estado: true,
          eliminado_en: true,
        },
      });
      if (!rol) throw new NotFoundException("roles.notFound");
      if (rol.eliminado_en) {
        throw new ConflictException("roles.alreadyDeleted");
      }
      const estadoNuevo = activo ? 1 : 0;
      if (rol.estado === estadoNuevo)
        throw new BadRequestException("roles.noChanges");
      await tx.roles.update({
        where: { id_roles: idRol },
        data: { estado: estadoNuevo, updated_by: idUsuario },
      });
      await tx.$executeRaw`UPDATE seguridad.roles SET updated_at = CURRENT_TIMESTAMP WHERE id_roles = ${idRol}::uuid`;
      await this.auditoria.registrar(
        {
          accion: activo ? "roles.activado" : "roles.desactivado",
          entidad: "roles",
          id_entidad: idRol,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuario,
          peticion: contexto,
          metadatos: {
            nombre: rol.nombre,
            alias: rol.codigo,
            estado_anterior: rol.estado,
            estado_nuevo: estadoNuevo,
          },
        },
        tx,
      );
    });
  }

  async eliminar(
    idRol: string,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.validarContexto(tx, idOrganizacion, idUsuario);
      await tx.$queryRaw`SELECT id_roles FROM seguridad.roles WHERE id_roles = ${idRol}::uuid FOR UPDATE`;
      const rol = await tx.roles.findFirst({
        where: {
          id_roles: idRol,
        },
        select: {
          nombre: true,
          codigo: true,
          descripcion: true,
          estado: true,
          eliminado_en: true,
        },
      });
      if (!rol) throw new NotFoundException("roles.notFound");
      if (rol.eliminado_en) {
        throw new ConflictException("roles.alreadyDeleted");
      }
      if (rol.estado !== 1) {
        throw new ConflictException("roles.inactiveDelete");
      }
      // Fechas exclusivamente desde PostgreSQL: evita diferencias entre relojes.
      await tx.$executeRaw`UPDATE seguridad.roles
        SET estado = 0,
            eliminado_en = CURRENT_TIMESTAMP,
            eliminado_por = ${idUsuario},
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ${idUsuario}
        WHERE id_roles = ${idRol}::uuid`;
      // Las asignaciones quedan inactivas en la misma transacción; no sobreviven
      // permisos efectivos apuntando a un rol eliminado.
      await tx.usuarios_roles.updateMany({
        where: { fid_roles: idRol, estado: 1 },
        data: { estado: 0, updated_by: idUsuario },
      });
      await tx.roles_permisos.updateMany({
        where: { fid_roles: idRol, estado: 1 },
        data: { estado: 0, updated_by: idUsuario },
      });
      await this.auditoria.registrar(
        {
          accion: "roles.eliminado",
          entidad: "roles",
          id_entidad: idRol,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuario,
          peticion: contexto,
          metadatos: {
            nombre: rol.nombre,
            alias: rol.codigo,
            descripcion: rol.descripcion,
          },
        },
        tx,
      );
    });
  }
}
