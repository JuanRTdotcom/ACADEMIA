import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../comun/prisma.service";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { Idioma } from "../../../comun/i18n/idiomas";
import type {
  PlanListado,
  DatosGestionarPlan,
  DatosActualizarModulosPlan,
} from "../../domain/entities/plan";

type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];
const GRUPO_UNIDADES_ALMACENAMIENTO = "unidades_almacenamiento";

@Injectable()
export class FuenteDatosPlanesPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  async listar(): Promise<PlanListado[]> {
    const filas = await this.prisma.planes.findMany({
      where: { eliminado_en: null },
      orderBy: { created_at: "asc" },
      select: {
        id_planes: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        almacenamiento_max_bytes: true,
        maximo_sedes: true,
        maximo_usuarios: true,
        maximo_mensajes_mensuales: true,
        maximo_uso_ia_mensual: true,
        estado: true,
        created_at: true,
        planes_modulos: {
          where: { estado: 1, modulo: { estado: 1 } },
          select: {
            modulo: {
              select: {
                id_modulos: true,
                codigo: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    return filas.map((f) => ({
      id_planes: f.id_planes,
      codigo: f.codigo,
      nombre: f.nombre,
      descripcion: f.descripcion,
      almacenamiento_max_bytes:
        f.almacenamiento_max_bytes === null
          ? null
          : Number(f.almacenamiento_max_bytes),
      maximo_sedes: f.maximo_sedes,
      maximo_usuarios: f.maximo_usuarios,
      maximo_mensajes_mensuales: f.maximo_mensajes_mensuales,
      maximo_uso_ia_mensual: f.maximo_uso_ia_mensual,
      estado: f.estado,
      created_at: f.created_at,
      modulos: f.planes_modulos.map((pm) => pm.modulo),
    }));
  }

  async obtener(id: string): Promise<PlanListado> {
    const f = await this.prisma.planes.findFirst({
      where: { id_planes: id, eliminado_en: null },
      select: {
        id_planes: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        almacenamiento_max_bytes: true,
        maximo_sedes: true,
        maximo_usuarios: true,
        maximo_mensajes_mensuales: true,
        maximo_uso_ia_mensual: true,
        estado: true,
        created_at: true,
        planes_modulos: {
          where: { estado: 1, modulo: { estado: 1 } },
          select: {
            modulo: {
              select: {
                id_modulos: true,
                codigo: true,
                nombre: true,
              },
            },
          },
        },
      },
    });
    if (!f) throw new NotFoundException("plans.notFound");

    return {
      id_planes: f.id_planes,
      codigo: f.codigo,
      nombre: f.nombre,
      descripcion: f.descripcion,
      almacenamiento_max_bytes:
        f.almacenamiento_max_bytes === null
          ? null
          : Number(f.almacenamiento_max_bytes),
      maximo_sedes: f.maximo_sedes,
      maximo_usuarios: f.maximo_usuarios,
      maximo_mensajes_mensuales: f.maximo_mensajes_mensuales,
      maximo_uso_ia_mensual: f.maximo_uso_ia_mensual,
      estado: f.estado,
      created_at: f.created_at,
      modulos: f.planes_modulos.map((pm) => pm.modulo),
    };
  }

  async crear(
    datos: DatosGestionarPlan,
    idOrganizacion: string,
    idActor: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    // Validar duplicado de código
    const existe = await this.prisma.planes.findUnique({
      where: { codigo: datos.codigo.toUpperCase() },
    });
    if (existe) throw new BadRequestException("plans.codeConflict");

    await this.prisma.$transaction(async (tx) => {
      const almacenamientoMaxBytes = await this.resolverAlmacenamiento(
        tx,
        datos,
      );
      const plan = await tx.planes.create({
        data: {
          codigo: datos.codigo.toUpperCase(),
          nombre: datos.nombre,
          descripcion: datos.descripcion || null,
          almacenamiento_max_bytes: almacenamientoMaxBytes,
          maximo_sedes: datos.maximo_sedes ?? null,
          maximo_usuarios: datos.maximo_usuarios ?? null,
          maximo_mensajes_mensuales:
            datos.maximo_mensajes_mensuales ?? null,
          maximo_uso_ia_mensual: datos.maximo_uso_ia_mensual ?? null,
          estado: 1,
          created_by: idActor,
          updated_by: idActor,
        },
      });

      await this.auditoria.registrar(
        {
          accion: "planes.creado",
          entidad: "planes",
          id_entidad: plan.id_planes,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idActor,
          peticion: contexto,
          metadatos: {
            codigo: datos.codigo,
            nombre: datos.nombre,
            almacenamiento_max_bytes:
              almacenamientoMaxBytes === null
                ? null
                : Number(almacenamientoMaxBytes),
            maximo_sedes: datos.maximo_sedes ?? null,
            maximo_usuarios: datos.maximo_usuarios ?? null,
            maximo_mensajes_mensuales:
              datos.maximo_mensajes_mensuales ?? null,
            maximo_uso_ia_mensual: datos.maximo_uso_ia_mensual ?? null,
          },
        },
        tx,
      );
    });
  }

  async actualizar(
    id: string,
    datos: DatosGestionarPlan,
    idOrganizacion: string,
    idActor: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    const plan = await this.prisma.planes.findFirst({
      where: { id_planes: id, eliminado_en: null },
    });
    if (!plan) throw new NotFoundException("plans.notFound");

    // Validar duplicado de código si cambia
    if (plan.codigo !== datos.codigo.toUpperCase()) {
      const existe = await this.prisma.planes.findUnique({
        where: { codigo: datos.codigo.toUpperCase() },
      });
      if (existe) throw new BadRequestException("plans.codeConflict");
    }

    await this.prisma.$transaction(async (tx) => {
      const almacenamientoMaxBytes = await this.resolverAlmacenamiento(
        tx,
        datos,
      );
      await tx.planes.update({
        where: { id_planes: id },
        data: {
          codigo: datos.codigo.toUpperCase(),
          nombre: datos.nombre,
          descripcion: datos.descripcion || null,
          almacenamiento_max_bytes: almacenamientoMaxBytes,
          maximo_sedes: datos.maximo_sedes ?? null,
          maximo_usuarios: datos.maximo_usuarios ?? null,
          maximo_mensajes_mensuales:
            datos.maximo_mensajes_mensuales ?? null,
          maximo_uso_ia_mensual: datos.maximo_uso_ia_mensual ?? null,
          updated_by: idActor,
        },
      });

      await this.auditoria.registrar(
        {
          accion: "planes.modificado",
          entidad: "planes",
          id_entidad: id,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idActor,
          peticion: contexto,
          metadatos: {
            codigo: datos.codigo,
            nombre: datos.nombre,
            almacenamiento_max_bytes:
              almacenamientoMaxBytes === null
                ? null
                : Number(almacenamientoMaxBytes),
            maximo_sedes: datos.maximo_sedes ?? null,
            maximo_usuarios: datos.maximo_usuarios ?? null,
            maximo_mensajes_mensuales:
              datos.maximo_mensajes_mensuales ?? null,
            maximo_uso_ia_mensual: datos.maximo_uso_ia_mensual ?? null,
          },
        },
        tx,
      );
    });
  }

  async actualizarModulos(
    id: string,
    datos: DatosActualizarModulosPlan,
    idOrganizacion: string,
    idActor: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    const plan = await this.prisma.planes.findFirst({
      where: { id_planes: id, eliminado_en: null },
    });
    if (!plan) throw new NotFoundException("plans.notFound");

    // Validar que todos los id_modulos existan y estén activos
    const modulosDisponibles = await this.prisma.modulos.findMany({
      where: {
        id_modulos: { in: datos.fid_modulos },
        estado: 1,
        NOT: {
          codigo: { startsWith: "superadmin." },
        },
      },
      select: { id_modulos: true },
    });

    if (modulosDisponibles.length !== datos.fid_modulos.length) {
      throw new BadRequestException("plans.invalidModules");
    }

    await this.prisma.$transaction(async (tx) => {
      // Eliminar módulos anteriores de este plan
      await tx.planes_modulos.deleteMany({
        where: { fid_planes: id },
      });

      // Insertar nuevos módulos para el plan
      if (datos.fid_modulos.length > 0) {
        await tx.planes_modulos.createMany({
          data: datos.fid_modulos.map((fid_modulos) => ({
            fid_planes: id,
            fid_modulos,
            estado: 1,
            created_by: idActor,
            updated_by: idActor,
          })),
        });
      }

      // Sincronizar con organizaciones_modulos
      const organizaciones = await tx.organizaciones.findMany({
        where: { fid_planes: id, eliminado_en: null },
        select: { id_organizaciones: true },
      });

      const idsOrgs = organizaciones.map((o) => o.id_organizaciones);
      if (idsOrgs.length > 0) {
        // Eliminar todos los módulos asociados a estas organizaciones
        await tx.organizaciones_modulos.deleteMany({
          where: { fid_organizaciones: { in: idsOrgs } },
        });

        // Insertar los nuevos
        if (datos.fid_modulos.length > 0) {
          const insertData: any[] = [];
          for (const idOrg of idsOrgs) {
            for (const fid_modulos of datos.fid_modulos) {
              insertData.push({
                fid_organizaciones: idOrg,
                fid_modulos,
                habilitado: true,
                estado: 1,
                created_by: idActor,
                updated_by: idActor,
              });
            }
          }
          await tx.organizaciones_modulos.createMany({ data: insertData });
        }
      }

      // Registrar auditoría
      await this.auditoria.registrar(
        {
          accion: "planes.modulos_actualizados",
          entidad: "planes",
          id_entidad: id,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idActor,
          peticion: contexto,
          metadatos: {
            modulos: datos.fid_modulos,
          },
        },
        tx,
      );
    });
  }

  async cambiarEstado(
    id: string,
    activo: boolean,
    idOrganizacion: string,
    idActor: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    const plan = await this.prisma.planes.findFirst({
      where: { id_planes: id, eliminado_en: null },
    });
    if (!plan) throw new NotFoundException("plans.notFound");

    await this.prisma.$transaction(async (tx) => {
      await tx.planes.update({
        where: { id_planes: id },
        data: {
          estado: activo ? 1 : 0,
          updated_by: idActor,
        },
      });

      await this.auditoria.registrar(
        {
          accion: activo ? "planes.activado" : "planes.desactivado",
          entidad: "planes",
          id_entidad: id,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idActor,
          peticion: contexto,
          metadatos: { activo },
        },
        tx,
      );
    });
  }

  async eliminar(
    id: string,
    idOrganizacion: string,
    idActor: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    const plan = await this.prisma.planes.findFirst({
      where: { id_planes: id, eliminado_en: null },
    });
    if (!plan) throw new NotFoundException("plans.notFound");

    // Verificar si el plan está en uso
    const enUso = await this.prisma.organizaciones.count({
      where: { fid_planes: id, eliminado_en: null },
    });
    if (enUso > 0) {
      throw new BadRequestException("plans.inUse");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.planes.update({
        where: { id_planes: id },
        data: {
          eliminado_en: new Date(),
          updated_by: idActor,
        },
      });

      await this.auditoria.registrar(
        {
          accion: "planes.eliminado",
          entidad: "planes",
          id_entidad: id,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idActor,
          peticion: contexto,
          metadatos: { eliminado: true },
        },
        tx,
      );
    });
  }

  async opcionesCreacion(): Promise<
    { id_modulos: string; codigo: string; nombre: string }[]
  > {
    return this.prisma.modulos.findMany({
      where: {
        estado: 1,
        NOT: {
          codigo: { startsWith: "superadmin." },
        },
      },
      orderBy: { orden: "asc" },
      select: {
        id_modulos: true,
        codigo: true,
        nombre: true,
      },
    });
  }

  async unidadesAlmacenamiento(idioma: Idioma) {
    const unidades = await this.prisma.parametros.findMany({
      where: {
        codigo_grupo: GRUPO_UNIDADES_ALMACENAMIENTO,
        estado: 1,
        valor_entero: { not: null },
      },
      orderBy: [{ orden: "asc" }, { id_parametros: "asc" }],
      select: {
        id_parametros: true,
        codigo: true,
        etiqueta: true,
        valor_entero: true,
        traducciones: {
          where: { codigo_idioma: idioma },
          select: { etiqueta: true },
          take: 1,
        },
      },
    });
    return unidades.map((unidad) => ({
      id_parametros: unidad.id_parametros,
      codigo: unidad.codigo,
      etiqueta: unidad.traducciones[0]?.etiqueta ?? unidad.etiqueta,
      factor_bytes: Number(unidad.valor_entero),
    }));
  }

  private async resolverAlmacenamiento(
    tx: Tx,
    datos: DatosGestionarPlan,
  ): Promise<bigint | null> {
    const valor = datos.almacenamiento_valor;
    const idUnidad = datos.fid_parametros_unidad_almacenamiento;
    if (valor === null || valor === undefined) {
      if (idUnidad !== null && idUnidad !== undefined)
        throw new BadRequestException("plans.invalidStorageUnit");
      return null;
    }
    if (!idUnidad) throw new BadRequestException("plans.invalidStorageUnit");

    const unidad = await tx.parametros.findFirst({
      where: {
        id_parametros: idUnidad,
        codigo_grupo: GRUPO_UNIDADES_ALMACENAMIENTO,
        estado: 1,
        valor_entero: { not: null },
      },
      select: { valor_entero: true },
    });
    if (!unidad?.valor_entero)
      throw new BadRequestException("plans.invalidStorageUnit");

    const bytes = BigInt(valor) * unidad.valor_entero;
    if (bytes > BigInt(Number.MAX_SAFE_INTEGER))
      throw new BadRequestException("plans.invalidStorageUnit");
    return bytes;
  }
}
