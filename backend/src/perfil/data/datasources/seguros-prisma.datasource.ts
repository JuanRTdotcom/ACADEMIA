import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "../../../../prisma/generated/client/client";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import { EVENTOS_FUNCIONALES } from "../../../comun/auditoria/eventos-funcionales";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../comun/prisma.service";
import {
  CODIGO_SEGURO_OTRO,
  GRUPO_SEGUROS,
} from "../../domain/entities/grupos-parametros";
import type {
  ComandoAgregarSeguro,
  ComandoEliminarSeguro,
  ComandoModificarSeguro,
  ResultadoGestionSeguros,
  SeguroPersona,
  SegurosPerfil,
} from "../../domain/entities/seguro-persona";
import {
  mapearParametroTraducible,
  seleccionarTraduccionesParametro,
} from "../mappers/parametro-traducible";

type ClientePrisma = PrismaService | Prisma.TransactionClient;

@Injectable()
export class FuenteDatosSegurosPrisma {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: ServicioAuditoria,
    private readonly configuracion: ConfigService,
  ) {}

  async listar(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<SegurosPerfil> {
    const idPersona = await this.obtenerPersonaActiva(
      idUsuario,
      idOrganizacion,
    );
    const [seguros, catalogo] = await Promise.all([
      this.listarActivos(this.prisma, idPersona),
      this.prisma.parametros
        .findMany({
          where: { codigo_grupo: GRUPO_SEGUROS, estado: 1 },
          orderBy: [{ orden: "asc" }, { etiqueta: "asc" }],
          select: {
            codigo: true,
            etiqueta: true,
            traducciones: seleccionarTraduccionesParametro,
          },
        })
        .then((items) =>
          items.map((fila) => ({
            ...mapearParametroTraducible(fila),
            permite_otro: fila.codigo === CODIGO_SEGURO_OTRO,
          })),
        ),
    ]);
    return { seguros, catalogo };
  }

  async agregar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarSeguro,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionSeguros> {
    return this.prisma.$transaction(async (tx) => {
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const cantidad = await tx.personas_seguros.count({
        where: { fid_personas: idPersona, estado: 1 },
      });
      const maximo = this.configuracion.getOrThrow<number>(
        "PROFILE_MAX_INSURANCES",
      );
      if (cantidad >= maximo)
        throw new BadRequestException({
          message: "profile.insurance.limit",
          args: { max: maximo },
        });
      const datos = await this.validarDatos(tx, comando);
      await this.asegurarNoDuplicado(tx, idPersona, datos, null);

      const seguro = await tx.personas_seguros.create({
        data: {
          fid_personas: idPersona,
          ...datos,
          created_by: idUsuario,
          updated_by: idUsuario,
        },
        select: { id_personas_seguros: true },
      });
      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.PERFIL_SEGURO_AGREGADO.codigo,
          entidad: "personas_seguros",
          id_entidad: seguro.id_personas_seguros,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuario,
          peticion: contexto,
          metadatos: { codigo_seguro: datos.codigo_seguro },
        },
        tx,
      );
      return { ok: true, seguros: await this.listarActivos(tx, idPersona) };
    });
  }

  async modificar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarSeguro,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionSeguros> {
    return this.prisma.$transaction(async (tx) => {
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const actual = await tx.personas_seguros.findFirst({
        where: {
          id_personas_seguros: comando.id_personas_seguros,
          fid_personas: idPersona,
          estado: 1,
        },
        select: {
          id_personas_seguros: true,
          codigo_seguro: true,
          nombre_otro: true,
          numero_seguro: true,
        },
      });
      if (!actual) throw new NotFoundException("profile.insurance.notFound");

      const datos = await this.validarDatos(tx, comando);
      if (
        actual.codigo_seguro === datos.codigo_seguro &&
        (actual.nombre_otro ?? "").toLocaleLowerCase() ===
          (datos.nombre_otro ?? "").toLocaleLowerCase() &&
        actual.numero_seguro.toLocaleLowerCase() ===
          datos.numero_seguro.toLocaleLowerCase()
      ) {
        throw new BadRequestException("profile.insurance.noChanges");
      }
      await this.asegurarNoDuplicado(
        tx,
        idPersona,
        datos,
        actual.id_personas_seguros,
      );
      await tx.personas_seguros.update({
        where: { id_personas_seguros: actual.id_personas_seguros },
        data: { ...datos, updated_by: idUsuario },
      });
      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.PERFIL_SEGURO_MODIFICADO.codigo,
          entidad: "personas_seguros",
          id_entidad: actual.id_personas_seguros,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuario,
          peticion: contexto,
          metadatos: { codigo_seguro: datos.codigo_seguro },
        },
        tx,
      );
      return { ok: true, seguros: await this.listarActivos(tx, idPersona) };
    });
  }

  async eliminar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarSeguro,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionSeguros> {
    return this.prisma.$transaction(async (tx) => {
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const seguro = await tx.personas_seguros.findFirst({
        where: {
          id_personas_seguros: comando.id_personas_seguros,
          fid_personas: idPersona,
          estado: 1,
        },
        select: { id_personas_seguros: true, codigo_seguro: true },
      });
      if (!seguro) throw new NotFoundException("profile.insurance.notFound");
      await tx.personas_seguros.update({
        where: { id_personas_seguros: seguro.id_personas_seguros },
        data: { estado: 0, updated_by: idUsuario },
      });
      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.PERFIL_SEGURO_ELIMINADO.codigo,
          entidad: "personas_seguros",
          id_entidad: seguro.id_personas_seguros,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuario,
          peticion: contexto,
          metadatos: { codigo_seguro: seguro.codigo_seguro },
        },
        tx,
      );
      return { ok: true, seguros: await this.listarActivos(tx, idPersona) };
    });
  }

  private async validarDatos(
    tx: Prisma.TransactionClient,
    comando: ComandoAgregarSeguro,
  ) {
    const maestro = await tx.parametros.findFirst({
      where: {
        codigo_grupo: GRUPO_SEGUROS,
        codigo: comando.codigo_seguro,
        estado: 1,
      },
      select: { codigo: true },
    });
    if (!maestro)
      throw new BadRequestException("profile.insurance.invalidProvider");
    const nombreOtro = comando.nombre_otro?.trim().replace(/\s+/g, " ") || null;
    const permiteOtro = maestro.codigo === CODIGO_SEGURO_OTRO;
    if (permiteOtro && !nombreOtro)
      throw new BadRequestException("profile.insurance.otherRequired");
    if (!permiteOtro && nombreOtro)
      throw new BadRequestException("profile.insurance.otherNotAllowed");
    return {
      codigo_seguro: maestro.codigo,
      nombre_otro: permiteOtro ? nombreOtro : null,
      numero_seguro: comando.numero_seguro.trim().replace(/\s+/g, " "),
    };
  }

  private async asegurarNoDuplicado(
    tx: Prisma.TransactionClient,
    idPersona: string,
    datos: {
      codigo_seguro: string;
      nombre_otro: string | null;
      numero_seguro: string;
    },
    excluirId: string | null,
  ) {
    const duplicado = await tx.personas_seguros.findFirst({
      where: {
        fid_personas: idPersona,
        codigo_seguro: datos.codigo_seguro,
        nombre_otro:
          datos.nombre_otro === null
            ? null
            : { equals: datos.nombre_otro, mode: "insensitive" },
        numero_seguro: { equals: datos.numero_seguro, mode: "insensitive" },
        estado: 1,
        ...(excluirId ? { id_personas_seguros: { not: excluirId } } : {}),
      },
      select: { id_personas_seguros: true },
    });
    if (duplicado) throw new ConflictException("profile.insurance.duplicate");
  }

  private async obtenerPersonaActiva(
    idUsuario: string,
    idOrganizacion: string,
  ) {
    const usuario = await this.prisma.usuarios.findFirst({
      where: {
        id_usuarios: idUsuario,
        fid_organizaciones: idOrganizacion,
        estado: 1,
        estado_cuenta: "activo",
        organizacion: { estado: 1, eliminado_en: null },
        persona: { fid_organizaciones: idOrganizacion, estado: 1 },
      },
      select: { fid_personas: true },
    });
    if (!usuario) throw new NotFoundException("profile.insurance.unavailable");
    return usuario.fid_personas;
  }

  private async bloquearPersona(
    tx: Prisma.TransactionClient,
    idUsuario: string,
    idOrganizacion: string,
  ) {
    const [persona] = await tx.$queryRaw<{ id_personas: string }[]>`
      SELECT p.id_personas
      FROM seguridad.usuarios AS u
      INNER JOIN nucleo.organizaciones AS o ON o.id_organizaciones = u.fid_organizaciones
      INNER JOIN personas.personas AS p ON p.id_personas = u.fid_personas
      WHERE u.id_usuarios = ${idUsuario}::uuid
        AND u.fid_organizaciones = ${idOrganizacion}::uuid
        AND u.estado = 1 AND u.estado_cuenta = 'activo'
        AND o.estado = 1
        AND o.eliminado_en IS NULL
        AND p.fid_organizaciones = ${idOrganizacion}::uuid AND p.estado = 1
      FOR UPDATE OF p
    `;
    if (!persona) throw new NotFoundException("profile.insurance.unavailable");
    return persona.id_personas;
  }

  private listarActivos(
    cliente: ClientePrisma,
    idPersona: string,
  ): Promise<SeguroPersona[]> {
    return cliente.personas_seguros
      .findMany({
        where: { fid_personas: idPersona, estado: 1 },
        orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
        select: {
          id_personas_seguros: true,
          codigo_seguro: true,
          nombre_otro: true,
          numero_seguro: true,
        },
      })
      .then(async (filas) => {
        const parametros = await cliente.parametros.findMany({
          where: {
            codigo_grupo: GRUPO_SEGUROS,
            codigo: { in: filas.map((fila) => fila.codigo_seguro) },
          },
          select: {
            codigo: true,
            etiqueta: true,
            traducciones: seleccionarTraduccionesParametro,
          },
        });
        const maestros = new Map(
          parametros.map((fila) => {
            const item = mapearParametroTraducible(fila);
            return [item.codigo, item] as const;
          }),
        );
        return filas.map((fila) => ({
          ...fila,
          seguro: {
            codigo: fila.codigo_seguro,
            etiqueta:
              maestros.get(fila.codigo_seguro)?.etiqueta ?? fila.codigo_seguro,
            traducciones: maestros.get(fila.codigo_seguro)?.traducciones ?? {},
            permite_otro: fila.codigo_seguro === CODIGO_SEGURO_OTRO,
          },
        }));
      });
  }
}
