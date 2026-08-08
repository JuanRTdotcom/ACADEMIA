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
import type {
  ComandoAgregarNacionalidad,
  ComandoEliminarNacionalidad,
  NacionalidadPersona,
  NacionalidadesPerfil,
  ResultadoGestionNacionalidades,
} from "../../domain/entities/nacionalidad-persona";

type ClientePrisma = PrismaService | Prisma.TransactionClient;

@Injectable()
export class FuenteDatosNacionalidadesPrisma {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: ServicioAuditoria,
    private readonly configuracion: ConfigService,
  ) {}

  /** La lectura también comprueba usuario, tenant, organización y persona activos. */
  async listar(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<NacionalidadesPerfil> {
    const idPersona = await this.obtenerPersonaActiva(
      idUsuario,
      idOrganizacion,
    );
    const [nacionalidades, catalogo] = await Promise.all([
      this.listarActivas(this.prisma, idPersona),
      this.prisma.admin_level_0.findMany({
        where: { estado: 1 },
        orderBy: { nombre_es: "asc" },
        select: {
          id_admin_level_0: true,
          codigo_iso2: true,
          nombre_es: true,
          nombre_en: true,
        },
      }),
    ]);
    return { nacionalidades, catalogo };
  }

  async agregar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarNacionalidad,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionNacionalidades> {
    return this.prisma.$transaction(async (tx) => {
      // Serializa las mutaciones de la misma persona y vuelve a validar el tenant.
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const cantidad = await tx.personas_nacionalidades.count({
        where: { fid_personas: idPersona, estado: 1 },
      });
      const maximo = this.configuracion.getOrThrow<number>(
        "PROFILE_MAX_NATIONALITIES",
      );
      if (cantidad >= maximo)
        throw new BadRequestException({
          message: "profile.nationalities.limit",
          args: { max: maximo },
        });
      const pais = await tx.admin_level_0.findFirst({
        where: {
          id_admin_level_0: comando.fid_admin_level_0,
          estado: 1,
        },
        select: { id_admin_level_0: true, codigo_iso2: true },
      });
      if (!pais) {
        throw new BadRequestException("profile.nationalities.invalidCountry");
      }

      const existente = await tx.personas_nacionalidades.findUnique({
        where: {
          fid_personas_fid_admin_level_0: {
            fid_personas: idPersona,
            fid_admin_level_0: pais.id_admin_level_0,
          },
        },
        select: { id_personas_nacionalidades: true, estado: true },
      });
      if (existente?.estado === 1) {
        throw new ConflictException("profile.nationalities.duplicate");
      }

      const nacionalidad = existente
        ? await tx.personas_nacionalidades.update({
            where: {
              id_personas_nacionalidades: existente.id_personas_nacionalidades,
            },
            data: { estado: 1, updated_by: idUsuario },
            select: { id_personas_nacionalidades: true },
          })
        : await tx.personas_nacionalidades.create({
            data: {
              fid_personas: idPersona,
              fid_admin_level_0: pais.id_admin_level_0,
              created_by: idUsuario,
              updated_by: idUsuario,
            },
            select: { id_personas_nacionalidades: true },
          });

      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.PERFIL_NACIONALIDAD_AGREGADA.codigo,
          entidad: "personas_nacionalidades",
          id_entidad: nacionalidad.id_personas_nacionalidades,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuario,
          peticion: contexto,
          metadatos: { codigo_iso2: pais.codigo_iso2 },
        },
        tx,
      );

      return {
        ok: true,
        nacionalidades: await this.listarActivas(tx, idPersona),
      };
    });
  }

  async eliminar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarNacionalidad,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionNacionalidades> {
    return this.prisma.$transaction(async (tx) => {
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const nacionalidad = await tx.personas_nacionalidades.findFirst({
        where: {
          id_personas_nacionalidades: comando.id_personas_nacionalidades,
          fid_personas: idPersona,
          estado: 1,
          pais: { estado: 1 },
        },
        select: {
          id_personas_nacionalidades: true,
          pais: { select: { codigo_iso2: true } },
        },
      });
      if (!nacionalidad) {
        throw new NotFoundException("profile.nationalities.notFound");
      }

      await tx.personas_nacionalidades.update({
        where: {
          id_personas_nacionalidades: nacionalidad.id_personas_nacionalidades,
        },
        data: { estado: 0, updated_by: idUsuario },
      });
      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.PERFIL_NACIONALIDAD_ELIMINADA.codigo,
          entidad: "personas_nacionalidades",
          id_entidad: nacionalidad.id_personas_nacionalidades,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuario,
          peticion: contexto,
          metadatos: { codigo_iso2: nacionalidad.pais.codigo_iso2 },
        },
        tx,
      );

      return {
        ok: true,
        nacionalidades: await this.listarActivas(tx, idPersona),
      };
    });
  }

  private async obtenerPersonaActiva(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<string> {
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
    if (!usuario) {
      throw new NotFoundException("profile.nationalities.unavailable");
    }
    return usuario.fid_personas;
  }

  private async bloquearPersona(
    tx: Prisma.TransactionClient,
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<string> {
    const [persona] = await tx.$queryRaw<{ id_personas: string }[]>`
      SELECT p.id_personas
      FROM seguridad.usuarios AS u
      INNER JOIN nucleo.organizaciones AS o
        ON o.id_organizaciones = u.fid_organizaciones
      INNER JOIN personas.personas AS p
        ON p.id_personas = u.fid_personas
      WHERE u.id_usuarios = ${idUsuario}::uuid
        AND u.fid_organizaciones = ${idOrganizacion}::uuid
        AND u.estado = 1
        AND u.estado_cuenta = 'activo'
        AND o.estado = 1
        AND o.eliminado_en IS NULL
        AND p.fid_organizaciones = ${idOrganizacion}::uuid
        AND p.estado = 1
      FOR UPDATE OF p
    `;
    if (!persona) {
      throw new NotFoundException("profile.nationalities.unavailable");
    }
    return persona.id_personas;
  }

  private listarActivas(
    cliente: ClientePrisma,
    idPersona: string,
  ): Promise<NacionalidadPersona[]> {
    return cliente.personas_nacionalidades.findMany({
      where: {
        fid_personas: idPersona,
        estado: 1,
        pais: { estado: 1 },
      },
      orderBy: { pais: { nombre_es: "asc" } },
      select: {
        id_personas_nacionalidades: true,
        fid_admin_level_0: true,
        pais: {
          select: {
            id_admin_level_0: true,
            codigo_iso2: true,
            nombre_es: true,
            nombre_en: true,
          },
        },
      },
    });
  }
}
