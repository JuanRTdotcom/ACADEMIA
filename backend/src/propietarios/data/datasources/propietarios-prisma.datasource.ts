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
  DatosPropietario,
  EliminacionPropietario,
  FiltrosPropietarios,
} from "../../domain/entities/propietario";

type Tx = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosPropietariosPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  private async validarContexto(
    tx: Tx,
    organizacion: string,
    usuario: string,
    sede: string,
  ) {
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
      select: {
        id_usuarios: true,
        usuarios_sedes: {
          where: {
            fid_sedes: sede,
            estado: 1,
            sede: { estado: 1, eliminado_en: null },
          },
          select: { id_usuarios_sedes: true },
          take: 1,
        },
      },
    });
    if (!actor || actor.usuarios_sedes.length !== 1)
      throw new NotFoundException("owners.unavailable");
  }

  private async existente(tx: Tx, id: string, organizacion: string) {
    await tx.$queryRaw`SELECT id_propietarios FROM personas.propietarios WHERE id_propietarios = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
    const actual = await tx.propietarios.findFirst({
      where: {
        id_propietarios: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
      },
    });
    if (!actual) throw new NotFoundException("owners.notFound");
    return actual;
  }

  private async validarReferencias(tx: Tx, datos: DatosPropietario) {
    const [tipoDocumento, fuente, pais, ubicacion] = await Promise.all([
      tx.parametros.findFirst({
        where: {
          id_parametros: datos.fid_parametros_tipo_documento,
          codigo_grupo: "tipos_documento",
          estado: 1,
        },
        select: { id_parametros: true },
      }),
      datos.fid_parametros_como_conocio
        ? tx.parametros.findFirst({
            where: {
              id_parametros: datos.fid_parametros_como_conocio,
              codigo_grupo: "como_conocio_veterinaria",
              estado: 1,
            },
            select: { codigo: true },
          })
        : Promise.resolve(null),
      datos.fid_admin_level_0
        ? tx.admin_level_0.findFirst({
            where: { id_admin_level_0: datos.fid_admin_level_0, estado: 1 },
            select: { id_admin_level_0: true },
          })
        : Promise.resolve(null),
      datos.fid_admin_level_3 && datos.fid_admin_level_0
        ? tx.admin_level_3.findFirst({
            where: {
              id_admin_level_3: datos.fid_admin_level_3,
              estado: 1,
              admin_level_1: {
                fid_admin_level_0: datos.fid_admin_level_0,
                estado: 1,
                admin_level_0: { estado: 1 },
              },
            },
            select: { id_admin_level_3: true },
          })
        : Promise.resolve(null),
    ]);
    if (!tipoDocumento)
      throw new BadRequestException("owners.invalidDocumentType");
    if (datos.fid_parametros_como_conocio && !fuente)
      throw new BadRequestException("owners.invalidSource");
    if (datos.fid_admin_level_0 && !pais)
      throw new BadRequestException("owners.invalidLocation");
    if (datos.fid_admin_level_3 && !ubicacion)
      throw new BadRequestException("owners.invalidLocation");
    const tieneNombreAlternativo = Boolean(datos.contacto_alternativo_nombre);
    const tieneTelefonoAlternativo = Boolean(
      datos.contacto_alternativo_telefono,
    );
    if (tieneNombreAlternativo !== tieneTelefonoAlternativo)
      throw new BadRequestException("owners.invalidAlternateContact");
    if (datos.sin_correo && (datos.correo || datos.correo_verificado))
      throw new BadRequestException("owners.invalidEmail");
    if (datos.correo_verificado && !datos.correo)
      throw new BadRequestException("owners.invalidEmail");
    if (datos.celular_verificado && !datos.celular)
      throw new BadRequestException("owners.invalidPhone");
    if (datos.como_conocio_otro && fuente?.codigo !== "otro")
      throw new BadRequestException("owners.invalidOtherSource");
  }

  private conflicto(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictException("owners.duplicate");
    throw error;
  }

  private seleccion() {
    return {
      id_propietarios: true,
      fid_sedes_registro: true,
      fid_parametros_tipo_documento: true,
      numero_documento: true,
      nombre_completo: true,
      foto_url: true,
      celular: true,
      celular_verificado_en: true,
      sin_correo: true,
      correo: true,
      correo_verificado_en: true,
      telefono_fijo: true,
      direccion: true,
      fid_admin_level_0: true,
      fid_admin_level_3: true,
      contacto_alternativo_nombre: true,
      contacto_alternativo_telefono: true,
      fid_parametros_como_conocio: true,
      como_conocio_otro: true,
      created_at: true,
      updated_at: true,
      tipo_documento: { select: { codigo: true, etiqueta: true } },
      como_conocio: { select: { codigo: true, etiqueta: true } },
      sede_registro: { select: { id_sedes: true, codigo: true, nombre: true } },
      pais: { select: { nombre_es: true, nombre_en: true } },
      admin_level_3: {
        select: {
          nombre: true,
          admin_level_1: { select: { nombre: true } },
          admin_level_2: { select: { nombre: true } },
        },
      },
      _count: {
        select: {
          mascotas: { where: { estado: 1, eliminado_en: null } },
        },
      },
      mascotas: {
        where: { estado: 1, eliminado_en: null },
        orderBy: [{ created_at: "desc" }, { id_mascotas: "desc" }],
        take: 4,
        select: {
          id_mascotas: true,
          nombre: true,
          foto_url: true,
        },
      },
    } satisfies Prisma.propietariosSelect;
  }

  async listar(
    organizacion: string,
    sede: string,
    filtros: FiltrosPropietarios,
  ) {
    const q = filtros.q?.trim();
    const base: Prisma.propietariosWhereInput = {
        fid_organizaciones: organizacion,
        fid_sedes_registro: sede,
        eliminado_en: null,
        organizacion: { estado: 1, eliminado_en: null },
        ...(q
          ? {
              OR: [
                { nombre_completo: { contains: q, mode: "insensitive" } },
                { numero_documento: { contains: q, mode: "insensitive" } },
                { celular: { contains: q, mode: "insensitive" } },
                { correo: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
    };
    const atras = Boolean(filtros.antes_de);
    const cursorId = filtros.antes_de ?? filtros.despues_de;
    const cursor = cursorId
      ? await this.prisma.propietarios.findFirst({ where: { AND: [base, { id_propietarios: cursorId }] }, select: { created_at: true, id_propietarios: true } })
      : null;
    if (cursorId && !cursor) throw new BadRequestException("owners.invalidCursor");
    const condicion: Prisma.propietariosWhereInput = cursor ? { OR: atras
      ? [{ created_at: { gt: cursor.created_at } }, { created_at: cursor.created_at, id_propietarios: { gt: cursor.id_propietarios } }]
      : [{ created_at: { lt: cursor.created_at } }, { created_at: cursor.created_at, id_propietarios: { lt: cursor.id_propietarios } }]
    } : {};
    const [filas, total] = await Promise.all([
      this.prisma.propietarios.findMany({
        where: { AND: [base, condicion] },
        orderBy: atras ? [{ created_at: "asc" }, { id_propietarios: "asc" }] : [{ created_at: "desc" }, { id_propietarios: "desc" }],
        take: 11,
        select: this.seleccion(),
      }),
      this.prisma.propietarios.count({ where: base }),
    ]);
    const hayMas = filas.length > 10;
    if (hayMas) filas.pop();
    if (atras) filas.reverse();
    const propietarios = filas;
    return {
      propietarios: propietarios.map(({ _count, mascotas, foto_url, ...item }) => ({
        ...item,
        foto_version: foto_url?.split("/").at(-1) ?? null,
        cantidad_mascotas: _count.mascotas,
        mascotas: mascotas.map(({ foto_url, ...mascota }) => ({
          ...mascota,
          foto_version: foto_url?.split("/").at(-1) ?? null,
        })),
        celular_verificado: Boolean(item.celular_verificado_en),
        correo_verificado: Boolean(item.correo_verificado_en),
      })),
      total,
      paginacion: {
        anterior: propietarios.length && (atras ? hayMas : Boolean(filtros.despues_de)) ? propietarios[0]!.id_propietarios : null,
        siguiente: propietarios.length && (atras || hayMas) ? propietarios.at(-1)!.id_propietarios : null,
      },
    };
  }

  async opciones(organizacion: string, sede: string, idioma: string) {
    const [parametros, perfil, paises, nivel1, nivel2, nivel3] =
      await Promise.all([
        this.prisma.parametros.findMany({
          where: {
            codigo_grupo: {
              in: ["tipos_documento", "como_conocio_veterinaria"],
            },
            estado: 1,
          },
          orderBy: [
            { codigo_grupo: "asc" },
            { orden: "asc" },
            { etiqueta: "asc" },
          ],
          select: {
            id_parametros: true,
            codigo_grupo: true,
            codigo: true,
            etiqueta: true,
            traducciones: {
              where: { codigo_idioma: idioma },
              select: { etiqueta: true },
              take: 1,
            },
          },
        }),
        this.prisma.sedes.findFirst({
          where: {
            fid_organizaciones: organizacion,
            id_sedes: sede,
            estado: 1,
            eliminado_en: null,
          },
          select: { fid_admin_level_0: true, fid_admin_level_3: true },
        }),
        this.prisma.admin_level_0.findMany({
          where: { estado: 1 },
          orderBy: { nombre_es: "asc" },
          select: {
            id_admin_level_0: true,
            codigo_iso2: true,
            nombre_es: true,
            nombre_en: true,
            etiqueta_admin_level_1: true,
            etiqueta_admin_level_2: true,
            etiqueta_admin_level_3: true,
          },
        }),
        this.prisma.admin_level_1.findMany({
          where: { estado: 1, admin_level_0: { estado: 1 } },
          orderBy: { nombre: "asc" },
          select: {
            id_admin_level_1: true,
            fid_admin_level_0: true,
            codigo: true,
            nombre: true,
          },
        }),
        this.prisma.admin_level_2.findMany({
          where: {
            estado: 1,
            admin_level_1: { estado: 1, admin_level_0: { estado: 1 } },
          },
          orderBy: { nombre: "asc" },
          select: {
            id_admin_level_2: true,
            fid_admin_level_1: true,
            codigo: true,
            nombre: true,
          },
        }),
        this.prisma.admin_level_3.findMany({
          where: {
            estado: 1,
            admin_level_1: { estado: 1, admin_level_0: { estado: 1 } },
          },
          orderBy: { nombre: "asc" },
          select: {
            id_admin_level_3: true,
            fid_admin_level_1: true,
            fid_admin_level_2: true,
            codigo: true,
            nombre: true,
          },
        }),
      ]);
    if (!perfil) throw new NotFoundException("owners.unavailable");
    const opciones = parametros.map(({ traducciones, ...item }) => ({
      ...item,
      etiqueta: traducciones[0]?.etiqueta ?? item.etiqueta,
    }));
    return {
      tipos_documento: opciones.filter(
        (item) => item.codigo_grupo === "tipos_documento",
      ),
      como_conocio: opciones.filter(
        (item) => item.codigo_grupo === "como_conocio_veterinaria",
      ),
      ubicacion_predeterminada: {
        fid_admin_level_0: perfil.fid_admin_level_0,
        fid_admin_level_3: perfil.fid_admin_level_3,
      },
      ubicaciones: {
        admin_level_0: paises.map(({ nombre_es, nombre_en, ...pais }) => ({
          ...pais,
          nombre: idioma === "en" ? nombre_en : nombre_es,
        })),
        admin_level_1: nivel1,
        admin_level_2: nivel2,
        admin_level_3: nivel3,
      },
    };
  }

  async obtener(id: string, organizacion: string) {
    const propietario = await this.prisma.propietarios.findFirst({
      where: {
        id_propietarios: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
        organizacion: { estado: 1, eliminado_en: null },
      },
      select: this.seleccion(),
    });
    if (!propietario) throw new NotFoundException("owners.notFound");
    const { foto_url, ...datos } = propietario;
    return {
      propietario: {
        ...datos,
        foto_version: foto_url?.split("/").at(-1) ?? null,
        celular_verificado: Boolean(propietario.celular_verificado_en),
        correo_verificado: Boolean(propietario.correo_verificado_en),
      },
    };
  }

  private datosPersistencia(
    datos: DatosPropietario,
    usuario: string,
    ahora: Date,
  ) {
    return {
      fid_parametros_tipo_documento: datos.fid_parametros_tipo_documento,
      numero_documento: datos.numero_documento.toUpperCase(),
      nombre_completo: datos.nombre_completo,
      celular: datos.celular,
      celular_verificado_en: datos.celular_verificado ? ahora : null,
      sin_correo: datos.sin_correo,
      correo: datos.sin_correo ? null : (datos.correo?.toLowerCase() ?? null),
      correo_verificado_en:
        !datos.sin_correo && datos.correo_verificado ? ahora : null,
      telefono_fijo: datos.telefono_fijo,
      direccion: datos.direccion,
      fid_admin_level_0: datos.fid_admin_level_0,
      fid_admin_level_3: datos.fid_admin_level_3,
      contacto_alternativo_nombre: datos.contacto_alternativo_nombre,
      contacto_alternativo_telefono: datos.contacto_alternativo_telefono,
      fid_parametros_como_conocio: datos.fid_parametros_como_conocio,
      como_conocio_otro: datos.como_conocio_otro,
      updated_by: usuario,
    };
  }

  async crear(
    organizacion: string,
    sede: string,
    datos: DatosPropietario,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.validarContexto(tx, organizacion, usuario, sede);
        await this.validarReferencias(tx, datos);
        const [{ ahora }] = await tx.$queryRaw<
          Array<{ ahora: Date }>
        >`SELECT CURRENT_TIMESTAMP AS ahora`;
        const propietario = await tx.propietarios.create({
          data: {
            fid_organizaciones: organizacion,
            fid_sedes_registro: sede,
            ...this.datosPersistencia(datos, usuario, ahora),
            created_by: usuario,
          },
          select: { id_propietarios: true },
        });
        await this.auditoria.registrar(
          {
            accion: "propietarios.creado",
            entidad: "propietarios",
            id_entidad: propietario.id_propietarios,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion: contexto,
            metadatos: { nombre: datos.nombre_completo, fid_sedes: sede },
          },
          tx,
        );
        return { id_propietarios: propietario.id_propietarios };
      });
    } catch (error) {
      this.conflicto(error);
    }
  }

  async actualizar(
    id: string,
    organizacion: string,
    sede: string,
    datos: DatosPropietario,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarContexto(tx, organizacion, usuario, sede);
        const actual = await this.existente(tx, id, organizacion);
        await this.validarReferencias(tx, datos);
        const campos: string[] = [];
        const comparaciones: Array<[string, unknown, unknown]> = [
          [
            "tipo_documento",
            actual.fid_parametros_tipo_documento,
            datos.fid_parametros_tipo_documento,
          ],
          [
            "numero_documento",
            actual.numero_documento,
            datos.numero_documento.toUpperCase(),
          ],
          ["nombre_completo", actual.nombre_completo, datos.nombre_completo],
          ["celular", actual.celular, datos.celular],
          [
            "celular_verificado",
            Boolean(actual.celular_verificado_en),
            datos.celular_verificado,
          ],
          ["sin_correo", actual.sin_correo, datos.sin_correo],
          [
            "correo",
            actual.correo,
            datos.sin_correo ? null : (datos.correo?.toLowerCase() ?? null),
          ],
          [
            "correo_verificado",
            Boolean(actual.correo_verificado_en),
            datos.correo_verificado,
          ],
          ["telefono_fijo", actual.telefono_fijo, datos.telefono_fijo],
          ["direccion", actual.direccion, datos.direccion],
          ["pais", actual.fid_admin_level_0, datos.fid_admin_level_0],
          ["ubicacion", actual.fid_admin_level_3, datos.fid_admin_level_3],
          [
            "contacto_alternativo_nombre",
            actual.contacto_alternativo_nombre,
            datos.contacto_alternativo_nombre,
          ],
          [
            "contacto_alternativo_telefono",
            actual.contacto_alternativo_telefono,
            datos.contacto_alternativo_telefono,
          ],
          [
            "como_conocio",
            actual.fid_parametros_como_conocio,
            datos.fid_parametros_como_conocio,
          ],
          [
            "como_conocio_otro",
            actual.como_conocio_otro,
            datos.como_conocio_otro,
          ],
        ];
        for (const [campo, antes, despues] of comparaciones)
          if (antes !== despues) campos.push(campo);
        if (!campos.length) throw new BadRequestException("owners.noChanges");
        const [{ ahora }] = await tx.$queryRaw<
          Array<{ ahora: Date }>
        >`SELECT CURRENT_TIMESTAMP AS ahora`;
        await tx.propietarios.update({
          where: { id_propietarios: id },
          data: this.datosPersistencia(datos, usuario, ahora),
        });
        await this.auditoria.registrar(
          {
            accion: "propietarios.modificado",
            entidad: "propietarios",
            id_entidad: id,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion: contexto,
            metadatos: { campos },
          },
          tx,
        );
      });
    } catch (error) {
      this.conflicto(error);
    }
  }

  async eliminar(
    id: string,
    organizacion: string,
    sede: string,
    datos: EliminacionPropietario,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await this.validarContexto(tx, organizacion, usuario, sede);
      await this.existente(tx, id, organizacion);
      const mascotas = await tx.$queryRaw<
        Array<{ id_mascotas: string; nombre: string; foto_url: string | null }>
      >`SELECT id_mascotas, nombre, foto_url FROM personas.mascotas WHERE fid_organizaciones = ${organizacion}::uuid AND fid_propietarios = ${id}::uuid AND eliminado_en IS NULL ORDER BY id_mascotas FOR UPDATE`;

      if (mascotas.length && !datos.confirmar_desvinculacion) {
        throw new ConflictException({
          message: "owners.petsResolutionRequired",
          publicData: {
            mascotas: mascotas.map(({ foto_url, ...mascota }) => ({
              ...mascota,
              foto_version: foto_url?.split("/").at(-1) ?? null,
            })),
            cantidad_mascotas: mascotas.length,
          },
        });
      }
      if (mascotas.length) {
        await tx.$executeRaw`
          UPDATE personas.mascotas
          SET fid_propietarios = NULL,
              updated_by = ${usuario},
              updated_at = CURRENT_TIMESTAMP
          WHERE fid_organizaciones = ${organizacion}::uuid
            AND fid_propietarios = ${id}::uuid
            AND eliminado_en IS NULL`;
        for (const mascota of mascotas) {
          await this.auditoria.registrar(
            {
              accion: "mascotas.propietario_retirado",
              entidad: "mascotas",
              id_entidad: mascota.id_mascotas,
              fid_organizaciones: organizacion,
              fid_usuarios: usuario,
              peticion: contexto,
              metadatos: {
                motivo: "eliminacion_propietario",
                propietario_anterior: id,
                propietario_nuevo: null,
              },
            },
            tx,
          );
        }
      }
      await tx.$executeRaw`UPDATE personas.propietarios SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_at = CURRENT_TIMESTAMP, updated_by = ${usuario} WHERE id_propietarios = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid`;
      await this.auditoria.registrar(
        {
          accion: "propietarios.eliminado",
          entidad: "propietarios",
          id_entidad: id,
          fid_organizaciones: organizacion,
          fid_usuarios: usuario,
          peticion: contexto,
          metadatos: {
            resolucion_mascotas: mascotas.length
              ? "sin_propietario"
              : "sin_mascotas",
            cantidad_mascotas: mascotas.length,
          },
        },
        tx,
      );
    });
  }
}
