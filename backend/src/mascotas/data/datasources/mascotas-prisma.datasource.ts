import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "../../../../prisma/generated/client/client";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { PrismaService } from "../../../comun/prisma.service";
import type {
  ArchivoMascota,
  DatosMascota,
  FiltrosMascotas,
} from "../../domain/entities/mascota";
import { AlmacenFotoMascotaR2 } from "./foto-mascota-r2.datasource";

type Tx = Prisma.TransactionClient;
const GRUPOS = {
  fid_parametros_genero: "generos_mascota",
  fid_parametros_color: "colores_mascota",
  fid_parametros_unidad_peso: "unidades_peso_mascota",
  fid_parametros_talla: "tallas_mascota",
  fid_parametros_estado_reproductivo: "estados_reproductivos_mascota",
  fid_parametros_temperamento: "temperamentos_mascota",
} as const;

@Injectable()
export class FuenteDatosMascotasPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
    private fotos: AlmacenFotoMascotaR2,
  ) {}

  private async validarContexto(tx: Tx, organizacion: string, usuario: string) {
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
    if (!actor) throw new NotFoundException("pets.unavailable");
  }

  private async existente(tx: Tx, id: string, organizacion: string) {
    await tx.$queryRaw`SELECT id_mascotas FROM personas.mascotas WHERE id_mascotas = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
    const mascota = await tx.mascotas.findFirst({
      where: {
        id_mascotas: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
      },
    });
    if (!mascota) throw new NotFoundException("pets.notFound");
    return mascota;
  }

  private async validarReferencias(
    tx: Tx,
    organizacion: string,
    datos: DatosMascota,
    ahora: Date,
  ) {
    if (datos.peso && Number(datos.peso) <= 0)
      throw new BadRequestException("pets.invalidData");
    if (
      datos.fecha_nacimiento &&
      (new Date(`${datos.fecha_nacimiento}T00:00:00.000Z`) > ahora ||
        datos.fecha_nacimiento < "1900-01-01")
    )
      throw new BadRequestException("pets.invalidData");
    if (datos.fid_razas_animales && datos.fid_subespecies_animales)
      throw new BadRequestException("pets.invalidSpecies");
    const parametrosSolicitados = Object.entries(GRUPOS).filter(([campo]) =>
      Boolean(datos[campo as keyof typeof GRUPOS]),
    );
    const [especie, subespecie, raza, propietario, ...parametros] =
      await Promise.all([
        tx.especies_animales.findFirst({
          where: {
            id_especies_animales: datos.fid_especies_animales,
            estado: 1,
          },
          select: { id_especies_animales: true },
        }),
        datos.fid_subespecies_animales
          ? tx.subespecies_animales.findFirst({
              where: {
                id_subespecies_animales: datos.fid_subespecies_animales,
                fid_especies_animales: datos.fid_especies_animales,
                estado: 1,
                especie: { estado: 1 },
              },
              select: { id_subespecies_animales: true },
            })
          : Promise.resolve(null),
        datos.fid_razas_animales
          ? tx.razas_animales.findFirst({
              where: {
                id_razas_animales: datos.fid_razas_animales,
                fid_especies_animales: datos.fid_especies_animales,
                estado: 1,
                especie: { estado: 1 },
              },
              select: { id_razas_animales: true },
            })
          : Promise.resolve(null),
        datos.fid_propietarios
          ? tx.propietarios.findFirst({
              where: {
                id_propietarios: datos.fid_propietarios,
                fid_organizaciones: organizacion,
                estado: 1,
                eliminado_en: null,
              },
              select: { id_propietarios: true },
            })
          : Promise.resolve(null),
        ...parametrosSolicitados.map(([campo, grupo]) =>
          tx.parametros.findFirst({
            where: {
              id_parametros: datos[campo as keyof typeof GRUPOS]!,
              codigo_grupo: grupo,
              estado: 1,
            },
            select: { id_parametros: true },
          }),
        ),
      ]);
    if (!especie) throw new BadRequestException("pets.invalidSpecies");
    if (datos.fid_subespecies_animales && !subespecie)
      throw new BadRequestException("pets.invalidSpecies");
    if (datos.fid_razas_animales && !raza)
      throw new BadRequestException("pets.invalidSpecies");
    if (datos.fid_propietarios && !propietario)
      throw new BadRequestException("pets.invalidOwner");
    if (parametros.some((parametro) => !parametro))
      throw new BadRequestException("pets.invalidCatalog");
  }

  private seleccion() {
    return {
      id_mascotas: true,
      fid_propietarios: true,
      foto_url: true,
      animal_servicio: true,
      apoyo_emocional: true,
      nombre: true,
      codigo_chip: true,
      fid_especies_animales: true,
      fid_subespecies_animales: true,
      fid_razas_animales: true,
      fid_parametros_genero: true,
      fid_parametros_color: true,
      fecha_nacimiento: true,
      peso: true,
      fid_parametros_unidad_peso: true,
      fid_parametros_talla: true,
      fid_parametros_estado_reproductivo: true,
      fid_parametros_temperamento: true,
      alimento: true,
      created_at: true,
      updated_at: true,
      propietario: {
        select: {
          id_propietarios: true,
          nombre_completo: true,
          numero_documento: true,
          celular: true,
          tipo_documento: { select: { etiqueta: true } },
        },
      },
      especie: { select: { codigo: true, nombre_es: true, nombre_en: true } },
      subespecie: {
        select: { codigo: true, nombre_es: true, nombre_en: true },
      },
      raza: { select: { codigo: true, nombre_es: true, nombre_en: true } },
      genero: { select: { codigo: true, etiqueta: true } },
      color: { select: { codigo: true, etiqueta: true, color_hex: true } },
      unidad_peso: { select: { codigo: true, etiqueta: true } },
      talla: { select: { codigo: true, etiqueta: true } },
      estado_reproductivo: { select: { codigo: true, etiqueta: true } },
      temperamento: {
        select: { codigo: true, etiqueta: true, color_hex: true },
      },
    } satisfies Prisma.mascotasSelect;
  }

  private presentar<
    T extends {
      foto_url: string | null;
      peso: Prisma.Decimal | null;
      especie: { nombre_es: string; nombre_en: string };
      subespecie: { nombre_es: string; nombre_en: string } | null;
      raza: { nombre_es: string; nombre_en: string } | null;
    },
  >(item: T, idioma = "es") {
    const { foto_url, raza, subespecie, ...mascota } = item;
    const clasificacion = raza ?? subespecie;
    return {
      ...mascota,
      peso: item.peso?.toString() ?? null,
      foto_version: foto_url?.split("/").at(-1) ?? null,
      especie: {
        ...item.especie,
        nombre:
          idioma === "en" ? item.especie.nombre_en : item.especie.nombre_es,
      },
      subespecie: clasificacion
        ? {
            ...clasificacion,
            nombre:
              idioma === "en"
                ? clasificacion.nombre_en
                : clasificacion.nombre_es,
          }
        : null,
    };
  }

  async listar(organizacion: string, filtros: FiltrosMascotas, idioma: string) {
    const q = filtros.q?.trim();
    const items = await this.prisma.mascotas.findMany({
      where: {
        fid_organizaciones: organizacion,
        eliminado_en: null,
        organizacion: { estado: 1, eliminado_en: null },
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: "insensitive" } },
                { codigo_chip: { contains: q, mode: "insensitive" } },
                {
                  propietario: {
                    nombre_completo: { contains: q, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ created_at: "desc" }, { id_mascotas: "desc" }],
      select: this.seleccion(),
    });
    return {
      mascotas: items.map((item) => this.presentar(item, idioma)),
      total: items.length,
    };
  }

  async opciones(idioma: string) {
    const grupos = Object.values(GRUPOS);
    const [parametros, especies, subespecies, razas] = await Promise.all([
      this.prisma.parametros.findMany({
        where: { codigo_grupo: { in: grupos }, estado: 1 },
        orderBy: [{ codigo_grupo: "asc" }, { orden: "asc" }],
        select: {
          id_parametros: true,
          codigo_grupo: true,
          codigo: true,
          etiqueta: true,
          color_hex: true,
          traducciones: {
            where: { codigo_idioma: idioma },
            select: { etiqueta: true },
            take: 1,
          },
        },
      }),
      this.prisma.especies_animales.findMany({
        where: { estado: 1 },
        orderBy: [{ orden: "asc" }, { nombre_es: "asc" }],
        select: {
          id_especies_animales: true,
          codigo: true,
          nombre_es: true,
          nombre_en: true,
          nombre_cientifico: true,
        },
      }),
      this.prisma.subespecies_animales.findMany({
        where: { estado: 1, especie: { estado: 1 } },
        orderBy: [{ orden: "asc" }, { nombre_es: "asc" }],
        select: {
          id_subespecies_animales: true,
          fid_especies_animales: true,
          codigo: true,
          nombre_es: true,
          nombre_en: true,
          nombre_cientifico: true,
        },
      }),
      this.prisma.razas_animales.findMany({
        where: { estado: 1, especie: { estado: 1 } },
        orderBy: [{ orden: "asc" }, { nombre_es: "asc" }],
        select: {
          id_razas_animales: true,
          fid_especies_animales: true,
          codigo: true,
          nombre_es: true,
          nombre_en: true,
        },
      }),
    ]);
    const traducidos = parametros.map(({ traducciones, ...item }) => ({
      ...item,
      etiqueta: traducciones[0]?.etiqueta ?? item.etiqueta,
    }));
    const porGrupo = (grupo: string) =>
      traducidos.filter((item) => item.codigo_grupo === grupo);
    return {
      especies: especies.map(({ nombre_es, nombre_en, ...item }) => ({
        ...item,
        nombre: idioma === "en" ? nombre_en : nombre_es,
      })),
      subespecies: subespecies.map(({ nombre_es, nombre_en, ...item }) => ({
        ...item,
        nombre: idioma === "en" ? nombre_en : nombre_es,
      })),
      razas: razas.map(({ nombre_es, nombre_en, ...item }) => ({
        ...item,
        nombre: idioma === "en" ? nombre_en : nombre_es,
      })),
      generos: porGrupo(GRUPOS.fid_parametros_genero),
      colores: porGrupo(GRUPOS.fid_parametros_color),
      unidades_peso: porGrupo(GRUPOS.fid_parametros_unidad_peso),
      tallas: porGrupo(GRUPOS.fid_parametros_talla),
      estados_reproductivos: porGrupo(
        GRUPOS.fid_parametros_estado_reproductivo,
      ),
      temperamentos: porGrupo(GRUPOS.fid_parametros_temperamento),
      unidad_peso_predeterminada:
        porGrupo(GRUPOS.fid_parametros_unidad_peso)[0]?.id_parametros ?? null,
    };
  }

  async buscarPropietarios(organizacion: string, q: string) {
    const propietarios = await this.prisma.propietarios.findMany({
      where: {
        fid_organizaciones: organizacion,
        estado: 1,
        eliminado_en: null,
        OR: [
          { nombre_completo: { contains: q, mode: "insensitive" } },
          { numero_documento: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { nombre_completo: "asc" },
      take: 20,
      select: {
        id_propietarios: true,
        nombre_completo: true,
        numero_documento: true,
        celular: true,
        tipo_documento: { select: { etiqueta: true } },
      },
    });
    return { propietarios };
  }

  async obtener(id: string, organizacion: string) {
    const item = await this.prisma.mascotas.findFirst({
      where: {
        id_mascotas: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
        organizacion: { estado: 1, eliminado_en: null },
      },
      select: this.seleccion(),
    });
    if (!item) throw new NotFoundException("pets.notFound");
    return { mascota: this.presentar(item) };
  }

  async obtenerFoto(id: string, version: string, organizacion: string) {
    const mascota = await this.prisma.mascotas.findFirst({
      where: {
        id_mascotas: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
      },
      select: { foto_url: true },
    });
    if (!mascota?.foto_url || mascota.foto_url.split("/").at(-1) !== version)
      throw new NotFoundException("pets.photoNotFound");
    return this.fotos.leer(mascota.foto_url);
  }

  private persistencia(datos: DatosMascota, usuario: string) {
    return {
      ...datos,
      fid_propietarios: datos.fid_propietarios,
      codigo_chip: datos.codigo_chip?.toUpperCase() ?? null,
      fecha_nacimiento: datos.fecha_nacimiento
        ? new Date(`${datos.fecha_nacimiento}T00:00:00.000Z`)
        : null,
      peso: datos.peso ? new Prisma.Decimal(datos.peso) : null,
      alimento: datos.alimento,
      updated_by: usuario,
    };
  }

  private conflicto(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new ConflictException("pets.duplicateChip");
    throw error;
  }

  async crear(
    organizacion: string,
    datos: DatosMascota,
    foto: ArchivoMascota | null,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    const id = randomUUID();
    const clave = foto
      ? await this.fotos.guardar(organizacion, id, foto)
      : null;
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarContexto(tx, organizacion, usuario);
        const [{ ahora }] = await tx.$queryRaw<
          Array<{ ahora: Date }>
        >`SELECT CURRENT_TIMESTAMP AS ahora`;
        await this.validarReferencias(tx, organizacion, datos, ahora);
        await tx.mascotas.create({
          data: {
            id_mascotas: id,
            fid_organizaciones: organizacion,
            foto_url: clave,
            ...this.persistencia(datos, usuario),
            created_by: usuario,
          },
        });
        await this.auditoria.registrar(
          {
            accion: "mascotas.creada",
            entidad: "mascotas",
            id_entidad: id,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion: contexto,
            metadatos: {
              nombre: datos.nombre,
              con_propietario: Boolean(datos.fid_propietarios),
            },
          },
          tx,
        );
      });
      return { id_mascotas: id };
    } catch (error) {
      await this.fotos.eliminarSeguro(clave);
      this.conflicto(error);
    }
  }

  async actualizar(
    id: string,
    organizacion: string,
    datos: DatosMascota,
    foto: ArchivoMascota | null,
    eliminarFoto: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    const nuevaFoto = foto
      ? await this.fotos.guardar(organizacion, id, foto)
      : null;
    try {
      const anterior = await this.prisma.$transaction(async (tx) => {
        await this.validarContexto(tx, organizacion, usuario);
        const actual = await this.existente(tx, id, organizacion);
        const [{ ahora }] = await tx.$queryRaw<
          Array<{ ahora: Date }>
        >`SELECT CURRENT_TIMESTAMP AS ahora`;
        await this.validarReferencias(tx, organizacion, datos, ahora);
        const siguiente = this.persistencia(datos, usuario);
        const campos = Object.entries(siguiente)
          .filter(
            ([campo, valor]) =>
              campo !== "updated_by" &&
              String(actual[campo as keyof typeof actual] ?? "") !==
                String(valor ?? ""),
          )
          .map(([campo]) => campo);
        if (nuevaFoto || eliminarFoto) campos.push("foto");
        if (!campos.length) throw new BadRequestException("pets.noChanges");
        await tx.mascotas.update({
          where: { id_mascotas: id },
          data: {
            ...siguiente,
            ...(nuevaFoto
              ? { foto_url: nuevaFoto }
              : eliminarFoto
                ? { foto_url: null }
                : {}),
          },
        });
        await this.auditoria.registrar(
          {
            accion: "mascotas.modificada",
            entidad: "mascotas",
            id_entidad: id,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion: contexto,
            metadatos: { campos },
          },
          tx,
        );
        return actual.foto_url;
      });
      if (nuevaFoto || eliminarFoto) await this.fotos.eliminarSeguro(anterior);
    } catch (error) {
      await this.fotos.eliminarSeguro(nuevaFoto);
      this.conflicto(error);
    }
  }

  async eliminar(
    id: string,
    organizacion: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    const foto = await this.prisma.$transaction(async (tx) => {
      await this.validarContexto(tx, organizacion, usuario);
      const actual = await this.existente(tx, id, organizacion);
      await tx.$executeRaw`UPDATE personas.mascotas SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE id_mascotas = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid`;
      await this.auditoria.registrar(
        {
          accion: "mascotas.eliminada",
          entidad: "mascotas",
          id_entidad: id,
          fid_organizaciones: organizacion,
          fid_usuarios: usuario,
          peticion: contexto,
        },
        tx,
      );
      return actual.foto_url;
    });
    await this.fotos.eliminarSeguro(foto);
  }
}
