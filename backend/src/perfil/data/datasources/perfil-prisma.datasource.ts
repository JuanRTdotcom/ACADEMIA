import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import type { Prisma } from "../../../../prisma/generated/client/client";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import { EVENTOS_FUNCIONALES } from "../../../comun/auditoria/eventos-funcionales";
import { PrismaService } from "../../../comun/prisma.service";
import { ServicioRelojBaseDatos } from "../../../comun/reloj-base-datos/servicio-reloj-base-datos";
import { ServicioEventosSesion } from "../../../comun/eventos-sesion/servicio-eventos-sesion";
import { ServicioAccionesRequeridas } from "../../../comun/acciones-requeridas/servicio-acciones-requeridas";
import {
  mapearParametroTraducible,
  seleccionarTraduccionesParametro,
} from "../mappers/parametro-traducible";
import type { ComandoCambiarContrasenia } from "../../domain/entities/comando-cambiar-contrasenia";
import type { ComandoActualizarApariencia } from "../../domain/entities/comando-actualizar-apariencia";
import type { PaginaActividadUsuario } from "../../domain/entities/actividad-usuario";
import {
  GRUPO_ESTADOS_CIVILES,
  GRUPO_NIVELES_INSTRUCCION,
  GRUPO_SEXOS,
} from "../../domain/entities/grupos-parametros";
import type {
  ComandoActualizarDatosPersonales,
  DatosPersonaPerfil,
  DatosPersonalesPerfil,
} from "../../domain/entities/datos-personales";
import type {
  ArchivoAvatarEntrada,
  AvatarPerfil,
} from "../../domain/entities/avatar-perfil";
import type {
  ComandoAgregarCorreo,
  ComandoActualizarVerificacionCorreo,
  ComandoEliminarCorreo,
  ComandoModificarCorreo,
  ComandoSeleccionarCorreoUso,
  CorreoPersona,
  ResultadoGestionCorreos,
} from "../../domain/entities/correo-persona";
import type { SesionesUsuario } from "../../domain/entities/sesion-usuario";
import type { ComandoActualizarSegundoFactor } from "../../domain/entities/comando-actualizar-segundo-factor";
import { AlmacenAvatarR2 } from "./avatar/avatar-r2.datasource";
import { FuenteDatosCatalogoTerritorialPrisma } from "./catalogo-territorial-prisma.datasource";

const MAXIMO_EVENTOS_ACTIVIDAD = 500;

@Injectable()
export class FuenteDatosPerfilPrisma {
  private readonly logger = new Logger(FuenteDatosPerfilPrisma.name);

  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
    private reloj: ServicioRelojBaseDatos,
    private avatares: AlmacenAvatarR2,
    private eventosSesion: ServicioEventosSesion,
    private territorio: FuenteDatosCatalogoTerritorialPrisma,
    private accionesRequeridas: ServicioAccionesRequeridas,
    private configuracion: ConfigService,
  ) {}

  /** Guarda la decisión en la tabla de seguridad preparada para el futuro TOTP. */
  async actualizarSegundoFactor(
    id_usuarios: string,
    fid_organizaciones: string,
    dto: ComandoActualizarSegundoFactor,
    peticion: ContextoSolicitud,
  ): Promise<{ ok: true; habilitado: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuarios.findFirst({
        where: {
          id_usuarios,
          fid_organizaciones,
          estado: 1,
          estado_cuenta: "activo",
        },
        select: { id_usuarios: true },
      });
      if (!usuario) {
        throw new BadRequestException("profile.account.unavailable");
      }

      const configuracion = await tx.usuario_mfa.upsert({
        where: {
          fid_usuarios_tipo: { fid_usuarios: id_usuarios, tipo: "totp" },
        },
        create: {
          fid_usuarios: id_usuarios,
          tipo: "totp",
          habilitado: dto.habilitado,
          created_by: id_usuarios,
          updated_by: id_usuarios,
        },
        update: {
          habilitado: dto.habilitado,
          estado: 1,
          updated_by: id_usuarios,
        },
        select: { id_usuario_mfa: true, habilitado: true },
      });

      await this.auditoria.registrar(
        {
          accion: "perfil.segundo_factor.preferencia_actualizada",
          entidad: "usuario_mfa",
          id_entidad: configuracion.id_usuario_mfa,
          fid_organizaciones,
          fid_usuarios: id_usuarios,
          peticion,
          metadatos: { habilitado: configuracion.habilitado, tipo: "totp" },
        },
        tx,
      );

      return { ok: true, habilitado: configuracion.habilitado };
    });
  }

  /** Lista únicamente sesiones vigentes del usuario y tenant autenticados. */
  async listarSesiones(
    id_usuarios: string,
    fid_organizaciones: string,
    id_sesion_actual: string,
  ): Promise<SesionesUsuario> {
    const filas = await this.prisma.$queryRaw<
      {
        id_sesiones: string;
        plataforma: string;
        tipo_dispositivo: string;
        modelo: string | null;
        version_so: string | null;
        version_app: string | null;
        agente_usuario: string | null;
        ip: string | null;
        es_local: boolean;
        ciudad: string | null;
        pais_es: string | null;
        pais_en: string | null;
        iniciada_en: Date;
        ultimo_uso_en: Date;
        expira_inactividad_en: Date;
        zona_horaria: string;
        ahora: Date;
      }[]
    >`
      WITH contexto AS (
        SELECT COALESCE(zh.nombre_iana, 'America/Lima') AS zona_horaria, CURRENT_TIMESTAMP AS ahora
        FROM seguridad.usuarios u
        INNER JOIN nucleo.organizaciones o
          ON o.id_organizaciones = u.fid_organizaciones
        INNER JOIN personas.personas p
          ON p.id_personas = u.fid_personas
        LEFT JOIN seguridad.preferencias_usuario pu
          ON pu.fid_usuarios = u.id_usuarios AND pu.estado = 1
        LEFT JOIN system.zonas_horarias zh
          ON zh.id_zonas_horarias = pu.fid_zonas_horarias AND zh.estado = 1
        WHERE u.id_usuarios = ${id_usuarios}::uuid
          AND u.fid_organizaciones = ${fid_organizaciones}::uuid
          AND u.estado = 1
          AND u.estado_cuenta = 'activo'
          AND o.estado = 1
          AND o.eliminado_en IS NULL
          AND p.estado = 1
      )
      SELECT
        s.id_sesiones,
        d.plataforma::text AS plataforma,
        d.tipo_dispositivo::text AS tipo_dispositivo,
        d.modelo,
        d.version_so,
        d.version_app,
        s.agente_usuario,
        s.ip,
        (
          system.a_inet(s.ip) IS NOT NULL AND (
            system.a_inet(s.ip) <<= '127.0.0.0/8'::inet OR
            system.a_inet(s.ip) <<= '10.0.0.0/8'::inet OR
            system.a_inet(s.ip) <<= '172.16.0.0/12'::inet OR
            system.a_inet(s.ip) <<= '192.168.0.0/16'::inet OR
            system.a_inet(s.ip) <<= '169.254.0.0/16'::inet OR
            system.a_inet(s.ip) <<= '::1/128'::inet OR
            system.a_inet(s.ip) <<= 'fc00::/7'::inet OR
            system.a_inet(s.ip) <<= 'fe80::/10'::inet
          )
        ) AS es_local,
        COALESCE(a1.nombre, geo.ciudad) AS ciudad,
        a0.nombre_es AS pais_es,
        a0.nombre_en AS pais_en,
        s.iniciada_en,
        s.ultimo_uso_en,
        s.expira_inactividad_en,
        c.zona_horaria,
        c.ahora
      FROM contexto c
      INNER JOIN seguridad.dispositivos d
        ON d.fid_usuarios = ${id_usuarios}::uuid AND d.estado = 1
      INNER JOIN seguridad.sesiones s
        ON s.fid_dispositivos = d.id_dispositivos
      LEFT JOIN LATERAL (
        SELECT r.ciudad, r.fid_admin_level_0, r.fid_admin_level_1
        FROM system.rangos_geo_ip r
        WHERE r.estado = 1
          AND system.a_inet(s.ip) IS NOT NULL
          AND system.a_inet(s.ip) BETWEEN r.ip_inicio AND r.ip_fin
        ORDER BY r.ip_inicio DESC, r.ip_fin ASC
        LIMIT 1
      ) geo ON true
      LEFT JOIN configuracion.admin_level_1 a1
        ON a1.id_admin_level_1 = geo.fid_admin_level_1 AND a1.estado = 1
      LEFT JOIN configuracion.admin_level_0 a0
        ON a0.id_admin_level_0 = geo.fid_admin_level_0 AND a0.estado = 1
      WHERE s.estado = 1
        AND s.revocada_en IS NULL
        AND s.expira_en > c.ahora
        AND s.expira_inactividad_en > c.ahora
        AND s.expira_absoluta_en > c.ahora
      ORDER BY (s.id_sesiones = ${id_sesion_actual}::uuid) DESC,
               s.ultimo_uso_en DESC
    `;
    const contexto = filas[0];
    if (!contexto) {
      throw new NotFoundException("profile.sessions.notFound");
    }
    return {
      sesiones: filas.map((fila) => ({
        id_sesiones: fila.id_sesiones,
        actual: fila.id_sesiones === id_sesion_actual,
        plataforma: fila.plataforma,
        tipo_dispositivo: fila.tipo_dispositivo,
        modelo: fila.modelo,
        version_so: fila.version_so,
        version_app: fila.version_app,
        agente_usuario: fila.agente_usuario,
        ip: fila.ip,
        ubicacion: fila.es_local
          ? { local: true, ciudad: null, pais_es: null, pais_en: null }
          : fila.ciudad || fila.pais_es
            ? {
                local: false,
                ciudad: fila.ciudad,
                pais_es: fila.pais_es,
                pais_en: fila.pais_en,
              }
            : null,
        iniciada_en: fila.iniciada_en.toISOString(),
        ultimo_uso_en: fila.ultimo_uso_en.toISOString(),
        expira_inactividad_en: fila.expira_inactividad_en.toISOString(),
      })),
      zona_horaria: contexto.zona_horaria,
      ahora: contexto.ahora.toISOString(),
    };
  }

  /** Cierra una sesión ajena a la actual dentro de una sola transacción. */
  async cerrarOtraSesion(
    id_usuarios: string,
    fid_organizaciones: string,
    id_sesion_actual: string,
    id_sesion_objetivo: string,
    peticion: ContextoSolicitud,
  ): Promise<{ ok: true }> {
    if (id_sesion_objetivo === id_sesion_actual) {
      throw new BadRequestException("profile.sessions.currentCannotClose");
    }
    await this.prisma.$transaction(async (tx) => {
      await this.bloquearPersona(tx, id_usuarios, fid_organizaciones);
      const ahora = await this.reloj.ahora(tx);
      const sesion = await tx.sesiones.findFirst({
        where: {
          id_sesiones: id_sesion_objetivo,
          estado: 1,
          revocada_en: null,
          expira_en: { gt: ahora },
          expira_inactividad_en: { gt: ahora },
          expira_absoluta_en: { gt: ahora },
          dispositivo: {
            fid_usuarios: id_usuarios,
            estado: 1,
            usuario: {
              fid_organizaciones,
              estado: 1,
              estado_cuenta: "activo",
              organizacion: { estado: 1, eliminado_en: null },
            },
          },
        },
        select: { id_sesiones: true, fid_dispositivos: true },
      });
      if (!sesion) throw new NotFoundException("profile.sessions.notFound");

      const cierre = await tx.sesiones.updateMany({
        where: { id_sesiones: sesion.id_sesiones, revocada_en: null },
        data: { revocada_en: ahora, updated_by: id_usuarios },
      });
      if (cierre.count !== 1) {
        throw new NotFoundException("profile.sessions.notFound");
      }
      await tx.dispositivos.update({
        where: { id_dispositivos: sesion.fid_dispositivos },
        data: { firebase_token_fcm: null, updated_by: id_usuarios },
      });
      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.AUTENTICACION_CIERRE_EXITO.codigo,
          entidad: "sesiones",
          id_entidad: sesion.id_sesiones,
          fid_organizaciones,
          fid_usuarios: id_usuarios,
          peticion,
          metadatos: { motivo: "cierre_remoto" },
        },
        tx,
      );
    });
    this.eventosSesion.emitir({
      fid_usuarios: id_usuarios,
      tipo: "session_revoked",
      sid: id_sesion_objetivo,
    });
    return { ok: true };
  }

  private async listarCorreosPersona(
    tx: Prisma.TransactionClient,
    idPersonas: string,
  ): Promise<CorreoPersona[]> {
    const correos = await tx.personas_correos.findMany({
      where: { fid_personas: idPersonas, estado: 1 },
      orderBy: { created_at: "asc" },
      select: {
        id_personas_correos: true,
        correo: true,
        verificado_en: true,
        usos: {
          where: { estado: 1 },
          orderBy: { tipo: "asc" },
          select: { tipo: true },
        },
      },
    });
    return correos.map(({ verificado_en, usos, ...correo }) => ({
      ...correo,
      usos: usos.map((uso) => uso.tipo),
      verificado: verificado_en !== null,
    }));
  }

  private async resultadoCorreos(
    tx: Prisma.TransactionClient,
    id_usuarios: string,
    fid_organizaciones: string,
    id_personas: string,
  ): Promise<Omit<ResultadoGestionCorreos, "ok">> {
    return {
      correos: await this.listarCorreosPersona(tx, id_personas),
      acciones_requeridas: await this.accionesRequeridas.resumir(
        tx,
        id_usuarios,
        fid_organizaciones,
      ),
    };
  }

  async agregarCorreo(
    id_usuarios: string,
    fid_organizaciones: string,
    dto: ComandoAgregarCorreo,
    peticion: ContextoSolicitud,
  ): Promise<ResultadoGestionCorreos> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const idPersonas = await this.bloquearPersona(
          tx,
          id_usuarios,
          fid_organizaciones,
        );
        const cantidad = await tx.personas_correos.count({
          where: { fid_personas: idPersonas, estado: 1 },
        });
        const maximo =
          this.configuracion.getOrThrow<number>("PROFILE_MAX_EMAILS");
        if (cantidad >= maximo)
          throw new BadRequestException({
            message: "profile.email.limit",
            args: { max: maximo },
          });

        const existenteActivo = await tx.personas_correos.findFirst({
          where: {
            fid_organizaciones,
            correo: dto.correo,
            estado: 1,
          },
        });
        if (existenteActivo) {
          throw new ConflictException("profile.email.duplicateOrganization");
        }

        const existente = await tx.personas_correos.findFirst({
          where: {
            fid_personas: idPersonas,
            fid_organizaciones,
            correo: dto.correo,
            estado: 0,
          },
          orderBy: { updated_at: "desc" },
        });
        const correoAgregado = existente
          ? await tx.personas_correos.update({
              where: { id_personas_correos: existente.id_personas_correos },
              data: {
                estado: 1,
                verificado_en: null,
                updated_by: id_usuarios,
              },
              select: { id_personas_correos: true },
            })
          : await tx.personas_correos.create({
              data: {
                fid_personas: idPersonas,
                fid_organizaciones,
                correo: dto.correo,
                created_by: id_usuarios,
                updated_by: id_usuarios,
              },
              select: { id_personas_correos: true },
            });
        if (existente) {
          await tx.personas_correos_usos.updateMany({
            where: {
              fid_personas: idPersonas,
              fid_personas_correos: existente.id_personas_correos,
              estado: 1,
            },
            data: { estado: 0, updated_by: id_usuarios },
          });
        }
        await this.auditoria.registrarConEvento(
          {
            accion: EVENTOS_FUNCIONALES.PERFIL_CORREO_AGREGADO.codigo,
            entidad: "personas_correos",
            id_entidad: correoAgregado.id_personas_correos,
            fid_organizaciones,
            fid_usuarios: id_usuarios,
            peticion,
          },
          tx,
        );
        await this.accionesRequeridas.reconciliarCorreosSinVerificar(
          tx,
          id_usuarios,
          fid_organizaciones,
          idPersonas,
          true,
        );
        return {
          ok: true as const,
          ...(await this.resultadoCorreos(
            tx,
            id_usuarios,
            fid_organizaciones,
            idPersonas,
          )),
        };
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException("profile.email.duplicateOrganization");
      }
      throw error;
    }
  }

  async modificarCorreo(
    id_usuarios: string,
    fid_organizaciones: string,
    dto: ComandoModificarCorreo,
    peticion: ContextoSolicitud,
  ): Promise<ResultadoGestionCorreos> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const idPersonas = await this.bloquearPersona(
          tx,
          id_usuarios,
          fid_organizaciones,
        );
        const correo = await tx.personas_correos.findFirst({
          where: {
            id_personas_correos: dto.id_personas_correos,
            fid_personas: idPersonas,
            fid_organizaciones,
            estado: 1,
          },
          select: { id_personas_correos: true, correo: true },
        });
        if (!correo) throw new NotFoundException("profile.email.notFound");
        const esPrincipal = await tx.personas_correos_usos.findFirst({
          where: { fid_personas: idPersonas, fid_personas_correos: correo.id_personas_correos, tipo: "principal", estado: 1 },
        });
        if (esPrincipal) throw new BadRequestException("profile.email.principalImmutable");
        if (correo.correo === dto.correo) {
          throw new BadRequestException("profile.email.noChanges");
        }

        const duplicado = await tx.personas_correos.findFirst({
          where: {
            fid_organizaciones,
            correo: dto.correo,
            estado: 1,
            id_personas_correos: { not: correo.id_personas_correos },
          },
          select: { id_personas_correos: true },
        });
        if (duplicado) {
          throw new ConflictException("profile.email.duplicateOrganization");
        }

        await tx.personas_correos.update({
          where: { id_personas_correos: correo.id_personas_correos },
          data: {
            correo: dto.correo,
            verificado_en: null,
            updated_by: id_usuarios,
          },
        });
        await tx.personas_correos_usos.updateMany({
          where: {
            fid_personas: idPersonas,
            fid_personas_correos: correo.id_personas_correos,
            tipo: { in: ["mensajes", "respaldo"] },
            estado: 1,
          },
          data: { estado: 0, updated_by: id_usuarios },
        });
        await this.auditoria.registrarConEvento(
          {
            accion: EVENTOS_FUNCIONALES.PERFIL_CORREO_MODIFICADO.codigo,
            entidad: "personas_correos",
            id_entidad: correo.id_personas_correos,
            fid_organizaciones,
            fid_usuarios: id_usuarios,
            peticion,
            metadatos: { verificacion_reiniciada: true },
          },
          tx,
        );
        await this.accionesRequeridas.reconciliarCorreosSinVerificar(
          tx,
          id_usuarios,
          fid_organizaciones,
          idPersonas,
        );
        return {
          ok: true as const,
          ...(await this.resultadoCorreos(
            tx,
            id_usuarios,
            fid_organizaciones,
            idPersonas,
          )),
        };
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException("profile.email.duplicateOrganization");
      }
      throw error;
    }
  }

  async eliminarCorreo(
    id_usuarios: string,
    fid_organizaciones: string,
    dto: ComandoEliminarCorreo,
    peticion: ContextoSolicitud,
  ): Promise<ResultadoGestionCorreos> {
    return this.prisma.$transaction(async (tx) => {
      const idPersonas = await this.bloquearPersona(
        tx,
        id_usuarios,
        fid_organizaciones,
      );
      const correo = await tx.personas_correos.findFirst({
        where: {
          id_personas_correos: dto.id_personas_correos,
          fid_personas: idPersonas,
          fid_organizaciones,
          estado: 1,
        },
        select: { id_personas_correos: true },
      });
      if (!correo) throw new NotFoundException("profile.email.notFound");
      const esPrincipal = await tx.personas_correos_usos.findFirst({
        where: { fid_personas: idPersonas, fid_personas_correos: correo.id_personas_correos, tipo: "principal", estado: 1 },
      });
      if (esPrincipal) throw new BadRequestException("profile.email.principalImmutable");

      await tx.personas_correos.update({
        where: { id_personas_correos: correo.id_personas_correos },
        data: {
          estado: 0,
          verificado_en: null,
          updated_by: id_usuarios,
        },
      });
      await tx.personas_correos_usos.updateMany({
        where: {
          fid_personas: idPersonas,
          fid_personas_correos: correo.id_personas_correos,
          estado: 1,
        },
        data: { estado: 0, updated_by: id_usuarios },
      });
      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.PERFIL_CORREO_ELIMINADO.codigo,
          entidad: "personas_correos",
          id_entidad: correo.id_personas_correos,
          fid_organizaciones,
          fid_usuarios: id_usuarios,
          peticion,
        },
        tx,
      );
      await this.accionesRequeridas.reconciliarCorreosSinVerificar(
        tx,
        id_usuarios,
        fid_organizaciones,
        idPersonas,
      );
      return {
        ok: true as const,
        ...(await this.resultadoCorreos(
          tx,
          id_usuarios,
          fid_organizaciones,
          idPersonas,
        )),
      };
    });
  }

  async seleccionarCorreoUso(
    id_usuarios: string,
    fid_organizaciones: string,
    dto: ComandoSeleccionarCorreoUso,
    peticion: ContextoSolicitud,
  ): Promise<ResultadoGestionCorreos> {
    return this.prisma.$transaction(async (tx) => {
      const idPersonas = await this.bloquearPersona(
        tx,
        id_usuarios,
        fid_organizaciones,
      );
      const elegido = await tx.personas_correos.findFirst({
        where: {
          id_personas_correos: dto.id_personas_correos,
          fid_personas: idPersonas,
          fid_organizaciones,
          estado: 1,
        },
      });
      if (!elegido) throw new NotFoundException("profile.email.notFound");
      if (!elegido.verificado_en)
        throw new BadRequestException("profile.email.unverifiedSelection");
      const uso = await tx.personas_correos_usos.upsert({
        where: {
          fid_personas_tipo: { fid_personas: idPersonas, tipo: dto.tipo },
        },
        create: {
          fid_personas: idPersonas,
          fid_personas_correos: elegido.id_personas_correos,
          tipo: dto.tipo,
          created_by: id_usuarios,
          updated_by: id_usuarios,
        },
        update: {
          fid_personas_correos: elegido.id_personas_correos,
          estado: 1,
          updated_by: id_usuarios,
        },
      });
      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.PERFIL_CORREO_USO_SELECCIONADO.codigo,
          entidad: "personas_correos_usos",
          id_entidad: uso.id_personas_correos_usos,
          fid_organizaciones,
          fid_usuarios: id_usuarios,
          peticion,
          metadatos: { tipo: dto.tipo },
        },
        tx,
      );
      await this.accionesRequeridas.reconciliarCorreosSinVerificar(
        tx,
        id_usuarios,
        fid_organizaciones,
        idPersonas,
      );
      return {
        ok: true,
        ...(await this.resultadoCorreos(
          tx,
          id_usuarios,
          fid_organizaciones,
          idPersonas,
        )),
      };
    });
  }

  async actualizarVerificacionCorreo(
    id_usuarios: string,
    fid_organizaciones: string,
    dto: ComandoActualizarVerificacionCorreo,
    peticion: ContextoSolicitud,
  ): Promise<ResultadoGestionCorreos> {
    return this.prisma.$transaction(async (tx) => {
      const idPersonas = await this.bloquearPersona(
        tx,
        id_usuarios,
        fid_organizaciones,
      );
      const correo = await tx.personas_correos.findFirst({
        where: {
          id_personas_correos: dto.id_personas_correos,
          fid_personas: idPersonas,
          fid_organizaciones,
          estado: 1,
        },
        select: { id_personas_correos: true },
      });
      if (!correo) throw new NotFoundException("profile.email.notFound");
      const esPrincipal = await tx.personas_correos_usos.findFirst({
        where: { fid_personas: idPersonas, fid_personas_correos: correo.id_personas_correos, tipo: "principal", estado: 1 },
      });
      if (esPrincipal) throw new BadRequestException("profile.email.principalImmutable");

      await tx.$executeRaw`
        UPDATE personas.personas_correos
        SET verificado_en = CASE
              WHEN ${dto.verificado} THEN CURRENT_TIMESTAMP
              ELSE NULL
            END,
            updated_by = ${id_usuarios}
        WHERE id_personas_correos = ${correo.id_personas_correos}::uuid
          AND fid_personas = ${idPersonas}::uuid
          AND fid_organizaciones = ${fid_organizaciones}::uuid
      `;
      if (!dto.verificado) {
        await tx.personas_correos_usos.updateMany({
          where: {
            fid_personas: idPersonas,
            fid_personas_correos: correo.id_personas_correos,
            tipo: { in: ["mensajes", "respaldo"] },
            estado: 1,
          },
          data: { estado: 0, updated_by: id_usuarios },
        });
      }

      await this.auditoria.registrar(
        {
          accion: "perfil.correo.verificacion_manual_actualizada",
          entidad: "personas_correos",
          id_entidad: correo.id_personas_correos,
          fid_organizaciones,
          fid_usuarios: id_usuarios,
          peticion,
          metadatos: { verificado: dto.verificado },
        },
        tx,
      );
      await this.accionesRequeridas.reconciliarCorreosSinVerificar(
        tx,
        id_usuarios,
        fid_organizaciones,
        idPersonas,
      );
      return {
        ok: true,
        ...(await this.resultadoCorreos(
          tx,
          id_usuarios,
          fid_organizaciones,
          idPersonas,
        )),
      };
    });
  }

  /**
   * Verifica fuera de la transacción (Argon2 es costoso), después bloquea la
   * credencial y confirma que nadie la cambió mientras se hacía la verificación.
   */
  async cambiarContrasenia(
    id_usuarios: string,
    fid_organizaciones: string,
    id_sesiones_actual: string,
    dto: ComandoCambiarContrasenia,
    peticion: ContextoSolicitud,
  ): Promise<{ ok: true }> {
    try {
      if (dto.contrasenia_nueva !== dto.confirmacion_contrasenia) {
        throw new BadRequestException("profile.password.confirmMismatch");
      }

      const usuario = await this.prisma.usuarios.findFirst({
        where: {
          id_usuarios,
          fid_organizaciones,
          estado: 1,
          estado_cuenta: "activo",
        },
        select: {
          credenciales: {
            where: {
              tipo: "contrasenia",
              estado: 1,
              hash_contrasenia: { not: null },
            },
            take: 1,
            select: { id_credenciales: true, hash_contrasenia: true, created_by: true },
          },
          historial_contrasenias: {
            where: { estado: 1 },
            orderBy: [
              { created_at: "desc" },
              { id_historial_contrasenias: "desc" },
            ],
            take: 5,
            select: { hash_contrasenia: true },
          },
        },
      });
      const credencial = usuario?.credenciales[0];
      if (!usuario || !credencial?.hash_contrasenia) {
        throw new BadRequestException("profile.password.unavailable");
      }

      const actualValida = await argon2
        .verify(credencial.hash_contrasenia, dto.contrasenia_actual)
        .catch(() => false);
      if (!actualValida) {
        throw new BadRequestException("profile.password.currentInvalid");
      }

      // Compara siempre todos los hashes. Evita atajos temporales y limita la
      // memoria histórica sensible a las cinco claves anteriores.
      let reutilizada = false;
      for (const hash of [
        credencial.hash_contrasenia,
        ...usuario.historial_contrasenias.map(
          (registro) => registro.hash_contrasenia,
        ),
      ]) {
        const coincide = await argon2
          .verify(hash, dto.contrasenia_nueva)
          .catch(() => false);
        reutilizada = reutilizada || coincide;
      }
      if (reutilizada) {
        throw new BadRequestException("profile.password.reused");
      }

      const hashNuevo = await argon2.hash(dto.contrasenia_nueva, {
        type: argon2.argon2id,
      });

      const sesionesRevocadas = await this.prisma.$transaction(async (tx) => {
        const [bloqueada] = await tx.$queryRaw<
          { id_credenciales: string; hash_contrasenia: string }[]
        >`
          SELECT c.id_credenciales, c.hash_contrasenia
          FROM seguridad.credenciales AS c
          JOIN seguridad.usuarios AS u ON u.id_usuarios = c.fid_usuarios
          WHERE c.id_credenciales = ${credencial.id_credenciales}::uuid
            AND c.fid_usuarios = ${id_usuarios}::uuid
            AND c.tipo = 'contrasenia'
            AND c.estado = 1
            AND u.fid_organizaciones = ${fid_organizaciones}::uuid
            AND u.estado = 1
            AND u.estado_cuenta = 'activo'
          FOR UPDATE OF c
        `;
        if (!bloqueada) {
          throw new BadRequestException("profile.password.unavailable");
        }
        if (bloqueada.hash_contrasenia !== credencial.hash_contrasenia) {
          throw new ConflictException("profile.password.conflict");
        }

        // Solo la contraseña creada por el propio usuario ingresa al historial de las 5 previas.
        // La clave inicial asignada por el administrador no cuenta.
        if (credencial.created_by === id_usuarios) {
          await tx.historial_contrasenias.create({
            data: {
              fid_usuarios: id_usuarios,
              hash_contrasenia: bloqueada.hash_contrasenia,
              created_by: id_usuarios,
              updated_by: id_usuarios,
            },
          });
        }
        await tx.credenciales.update({
          where: { id_credenciales: bloqueada.id_credenciales },
          data: { hash_contrasenia: hashNuevo, created_by: id_usuarios, updated_by: id_usuarios },
        });

        await this.accionesRequeridas.resolverCambioContraseniaRequerido(
          tx,
          id_usuarios,
          fid_organizaciones,
        );

        const sobrantes = await tx.historial_contrasenias.findMany({
          where: { fid_usuarios: id_usuarios },
          orderBy: [
            { created_at: "desc" },
            { id_historial_contrasenias: "desc" },
          ],
          skip: 5,
          select: { id_historial_contrasenias: true },
        });
        if (sobrantes.length) {
          await tx.historial_contrasenias.deleteMany({
            where: {
              id_historial_contrasenias: {
                in: sobrantes.map((item) => item.id_historial_contrasenias),
              },
            },
          });
        }

        const revocadas = await tx.$queryRaw<{ id_sesiones: string }[]>`
          UPDATE seguridad.sesiones AS s
          SET revocada_en = CURRENT_TIMESTAMP,
              updated_by = ${id_usuarios}
          FROM seguridad.dispositivos AS d
          WHERE s.fid_dispositivos = d.id_dispositivos
            AND d.fid_usuarios = ${id_usuarios}::uuid
            AND s.id_sesiones <> ${id_sesiones_actual}::uuid
            AND s.revocada_en IS NULL
            AND s.estado = 1
          RETURNING s.id_sesiones
        `;

        await this.auditoria.registrarConEvento(
          {
            accion: EVENTOS_FUNCIONALES.PERFIL_CONTRASENIA_ACTUALIZADA.codigo,
            entidad: "credenciales",
            id_entidad: bloqueada.id_credenciales,
            fid_organizaciones,
            fid_usuarios: id_usuarios,
            peticion,
            metadatos: { sesiones_revocadas: revocadas.length },
          },
          tx,
        );
        return revocadas.map((sesion) => sesion.id_sesiones);
      });

      // Emitir después del commit: cada conexión de otra sesión sale al instante.
      for (const sid of sesionesRevocadas) {
        try {
          this.eventosSesion.emitir({
            fid_usuarios: id_usuarios,
            tipo: "session_revoked",
            sid,
          });
        } catch (error) {
          // Cambio ya confirmado. Un fallo del canal en memoria no debe convertir
          // una operación exitosa en 500; la siguiente petición igual verá revocación.
          this.logger.warn(
            `No se notificó revocación de sesión: sid=${sid}; ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      return { ok: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `No se pudo cambiar contraseña: usuario=${id_usuarios}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException("profile.password.saveError");
    }
  }

  private async bloquearPersona(
    tx: Prisma.TransactionClient,
    id_usuarios: string,
    fid_organizaciones: string,
  ): Promise<string> {
    const [bloqueada] = await tx.$queryRaw<{ id_personas: string }[]>`
      SELECT p.id_personas
      FROM seguridad.usuarios AS u
      INNER JOIN nucleo.organizaciones AS o
        ON o.id_organizaciones = u.fid_organizaciones
      JOIN personas.personas AS p ON p.id_personas = u.fid_personas
      WHERE u.id_usuarios = ${id_usuarios}::uuid
        AND u.fid_organizaciones = ${fid_organizaciones}::uuid
        AND u.estado = 1
        AND u.estado_cuenta = 'activo'
        AND o.estado = 1
        AND o.eliminado_en IS NULL
        AND p.fid_organizaciones = ${fid_organizaciones}::uuid
        AND p.estado = 1
      FOR UPDATE OF p
    `;
    if (!bloqueada) {
      throw new NotFoundException("profile.personal.notFound");
    }
    return bloqueada.id_personas;
  }

  /** Lee solo metadatos seguros que necesita la vista; nunca expone `datos`. */
  private metadatoTexto(
    metadatos: Prisma.JsonValue | null,
    campo: "agente_usuario",
  ): string | null {
    if (
      !metadatos ||
      typeof metadatos !== "object" ||
      Array.isArray(metadatos)
    ) {
      return null;
    }
    const valor = metadatos[campo];
    return typeof valor === "string" && valor.trim()
      ? valor.slice(0, 255)
      : null;
  }

  /** Convierte @db.Date a fecha civil ISO. No aplica zona horaria. */
  private fechaCivil(fecha: Date | null): string | null {
    return fecha ? fecha.toISOString().slice(0, 10) : null;
  }

  private personaPublica(persona: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    codigo_sexo: string | null;
    codigo_estado_civil: string | null;
    codigo_nivel_instruccion: string | null;
    fecha_nacimiento: Date | null;
    discapacidad: boolean;
    fid_admin_level_0_procedencia: string | null;
    admin_level_3_procedencia: { codigo: string } | null;
    fid_admin_level_0_residencia: string | null;
    admin_level_3_residencia: { codigo: string } | null;
    direccion: string | null;
    referencia: string | null;
  }): DatosPersonaPerfil {
    return {
      nombres: persona.nombres,
      apellido_paterno: persona.apellido_paterno,
      apellido_materno: persona.apellido_materno,
      codigo_sexo: persona.codigo_sexo,
      codigo_estado_civil: persona.codigo_estado_civil,
      codigo_nivel_instruccion: persona.codigo_nivel_instruccion,
      fecha_nacimiento: this.fechaCivil(persona.fecha_nacimiento),
      discapacidad: persona.discapacidad,
      fid_admin_level_0_procedencia: persona.fid_admin_level_0_procedencia,
      codigo_admin_level_3_procedencia:
        persona.admin_level_3_procedencia?.codigo ?? null,
      fid_admin_level_0_residencia: persona.fid_admin_level_0_residencia,
      codigo_admin_level_3_residencia:
        persona.admin_level_3_residencia?.codigo ?? null,
      direccion: persona.direccion,
      referencia: persona.referencia,
    };
  }

  /** Todo lo requerido por Datos personales sale junto antes del SSR. */
  async obtenerDatosPersonales(
    id_usuarios: string,
    fid_organizaciones: string,
  ): Promise<DatosPersonalesPerfil> {
    const [usuario, parametros, territorio] = await Promise.all([
      this.prisma.usuarios.findFirst({
        where: {
          id_usuarios,
          fid_organizaciones,
          estado: 1,
          persona: { fid_organizaciones, estado: 1 },
        },
        select: {
          persona: {
            select: {
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
              codigo_sexo: true,
              codigo_estado_civil: true,
              codigo_nivel_instruccion: true,
              fecha_nacimiento: true,
              discapacidad: true,
              fid_admin_level_0_procedencia: true,
              admin_level_3_procedencia: { select: { codigo: true } },
              fid_admin_level_0_residencia: true,
              admin_level_3_residencia: { select: { codigo: true } },
              direccion: true,
              referencia: true,
              foto_url: true,
            },
          },
          usuarios_roles: {
            // Roles son globales; empresa se valida en usuario/persona, no en rol.
            where: { estado: 1, rol: { estado: 1, eliminado_en: null } },
            orderBy: { rol: { nombre: "asc" } },
            select: { rol: { select: { codigo: true, nombre: true } } },
          },
        },
      }),
      this.prisma.parametros.findMany({
        where: {
          codigo_grupo: {
            in: [GRUPO_SEXOS, GRUPO_ESTADOS_CIVILES, GRUPO_NIVELES_INSTRUCCION],
          },
          estado: 1,
        },
        orderBy: [{ codigo_grupo: "asc" }, { orden: "asc" }],
        select: {
          codigo_grupo: true,
          codigo: true,
          etiqueta: true,
          traducciones: seleccionarTraduccionesParametro,
        },
      }),
      this.territorio.listarJerarquiaAdministrativa(),
    ]);

    if (!usuario) throw new NotFoundException("profile.personal.notFound");

    const opciones = (grupo: string) =>
      parametros
        .filter((item) => item.codigo_grupo === grupo)
        .map(mapearParametroTraducible)
        .map(({ codigo, etiqueta, traducciones }) => ({
          codigo,
          etiqueta,
          traducciones,
        }));

    return {
      persona: this.personaPublica(usuario.persona),
      catalogos: {
        sexos: opciones(GRUPO_SEXOS),
        estados_civiles: opciones(GRUPO_ESTADOS_CIVILES),
        niveles_instruccion: opciones(GRUPO_NIVELES_INSTRUCCION),
        ...territorio,
      },
      roles: usuario.usuarios_roles.map(({ rol }) => rol),
      avatar: {
        disponible: Boolean(usuario.persona.foto_url),
        version: usuario.persona.foto_url?.split("/").at(-1) ?? null,
      },
    };
  }

  /** Persona y auditoría se confirman o revierten como una sola unidad. */
  async actualizarDatosPersonales(
    id_usuarios: string,
    fid_organizaciones: string,
    dto: ComandoActualizarDatosPersonales,
    peticion: ContextoSolicitud,
  ): Promise<{ ok: true; persona: DatosPersonaPerfil }> {
    return this.prisma.$transaction(async (tx) => {
      // Prisma no expone FOR UPDATE. PostgreSQL serializa cambios concurrentes
      // sobre esta persona para evitar que dos guardados se pisen entre sí.
      await this.bloquearPersona(tx, id_usuarios, fid_organizaciones);

      const usuario = await tx.usuarios.findFirst({
        where: {
          id_usuarios,
          fid_organizaciones,
          estado: 1,
          persona: { fid_organizaciones, estado: 1 },
        },
        select: {
          fid_personas: true,
          persona: {
            include: {
              admin_level_3_procedencia: { select: { codigo: true } },
              admin_level_3_residencia: { select: { codigo: true } },
            },
          },
        },
      });
      if (!usuario) throw new NotFoundException("profile.personal.notFound");

      const parametros = await tx.parametros.findMany({
        where: {
          OR: [
            ...(dto.codigo_sexo
              ? [
                  {
                    codigo_grupo: GRUPO_SEXOS,
                    codigo: dto.codigo_sexo,
                    estado: 1,
                  },
                ]
              : []),
            ...(dto.codigo_estado_civil
              ? [
                  {
                    codigo_grupo: GRUPO_ESTADOS_CIVILES,
                    codigo: dto.codigo_estado_civil,
                    estado: 1,
                  },
                ]
              : []),
            ...(dto.codigo_nivel_instruccion
              ? [
                  {
                    codigo_grupo: GRUPO_NIVELES_INSTRUCCION,
                    codigo: dto.codigo_nivel_instruccion,
                    estado: 1,
                  },
                ]
              : []),
          ],
        },
        select: { codigo_grupo: true },
      });
      if (
        (dto.codigo_sexo &&
          !parametros.some((p) => p.codigo_grupo === GRUPO_SEXOS)) ||
        (dto.codigo_estado_civil &&
          !parametros.some((p) => p.codigo_grupo === GRUPO_ESTADOS_CIVILES)) ||
        (dto.codigo_nivel_instruccion &&
          !parametros.some((p) => p.codigo_grupo === GRUPO_NIVELES_INSTRUCCION))
      ) {
        throw new BadRequestException("profile.personal.invalidCatalog");
      }

      if (dto.fecha_nacimiento) {
        const [fecha] = await tx.$queryRaw<{ valida: boolean }[]>`
          SELECT
            TO_CHAR(TO_DATE(${dto.fecha_nacimiento}, 'YYYY-MM-DD'), 'YYYY-MM-DD') = ${dto.fecha_nacimiento}
            AND TO_DATE(${dto.fecha_nacimiento}, 'YYYY-MM-DD') <= CURRENT_DATE AS valida
        `;
        if (!fecha?.valida) {
          throw new BadRequestException("profile.personal.invalidBirthDate");
        }
      }

      if (
        Boolean(dto.fid_admin_level_0_procedencia) !==
          Boolean(dto.codigo_admin_level_3_procedencia) ||
        Boolean(dto.fid_admin_level_0_residencia) !==
          Boolean(dto.codigo_admin_level_3_residencia)
      ) {
        throw new BadRequestException("profile.personal.invalidLocation");
      }
      const [
        paisProcedencia,
        nivel3Procedencia,
        paisResidencia,
        nivel3Residencia,
      ] = await Promise.all([
        dto.fid_admin_level_0_procedencia
          ? tx.admin_level_0.findFirst({
              where: {
                id_admin_level_0: dto.fid_admin_level_0_procedencia,
                estado: 1,
              },
              select: { id_admin_level_0: true },
            })
          : null,
        dto.codigo_admin_level_3_procedencia
          ? tx.admin_level_3.findFirst({
              where: {
                codigo: dto.codigo_admin_level_3_procedencia,
                estado: 1,
                admin_level_1: {
                  estado: 1,
                  fid_admin_level_0: dto.fid_admin_level_0_procedencia!,
                  admin_level_0: { estado: 1 },
                },
              },
              select: { id_admin_level_3: true },
            })
          : null,
        dto.fid_admin_level_0_residencia
          ? tx.admin_level_0.findFirst({
              where: {
                id_admin_level_0: dto.fid_admin_level_0_residencia,
                estado: 1,
              },
              select: { id_admin_level_0: true },
            })
          : null,
        dto.codigo_admin_level_3_residencia
          ? tx.admin_level_3.findFirst({
              where: {
                codigo: dto.codigo_admin_level_3_residencia,
                estado: 1,
                admin_level_1: {
                  estado: 1,
                  fid_admin_level_0: dto.fid_admin_level_0_residencia!,
                  admin_level_0: { estado: 1 },
                },
              },
              select: { id_admin_level_3: true },
            })
          : null,
      ]);
      if (
        (dto.fid_admin_level_0_procedencia && !paisProcedencia) ||
        (dto.codigo_admin_level_3_procedencia && !nivel3Procedencia) ||
        (dto.fid_admin_level_0_residencia && !paisResidencia) ||
        (dto.codigo_admin_level_3_residencia && !nivel3Residencia)
      ) {
        throw new BadRequestException("profile.personal.invalidLocation");
      }

      const anterior = this.personaPublica(usuario.persona);
      const camposPersonales = Object.keys(anterior) as Array<
        keyof DatosPersonaPerfil
      >;
      if (camposPersonales.every((campo) => anterior[campo] === dto[campo])) {
        throw new BadRequestException("profile.personal.noChanges");
      }

      // PostgreSQL convierte la fecha civil y el trigger fija updated_at con su reloj.
      const actualizadas = await tx.$executeRaw`
        UPDATE personas.personas
        SET nombres = ${dto.nombres},
            apellido_paterno = ${dto.apellido_paterno},
            apellido_materno = ${dto.apellido_materno},
            codigo_sexo = ${dto.codigo_sexo},
            codigo_estado_civil = ${dto.codigo_estado_civil},
            codigo_nivel_instruccion = ${dto.codigo_nivel_instruccion},
            fecha_nacimiento = CAST(${dto.fecha_nacimiento} AS date),
            discapacidad = ${dto.discapacidad},
            fid_admin_level_0_procedencia = ${dto.fid_admin_level_0_procedencia}::uuid,
            fid_admin_level_3_procedencia = ${nivel3Procedencia?.id_admin_level_3 ?? null}::uuid,
            fid_admin_level_0_residencia = ${dto.fid_admin_level_0_residencia}::uuid,
            fid_admin_level_3_residencia = ${nivel3Residencia?.id_admin_level_3 ?? null}::uuid,
            direccion = ${dto.direccion},
            referencia = ${dto.referencia},
            updated_by = ${id_usuarios}
        WHERE id_personas = ${usuario.fid_personas}::uuid
          AND fid_organizaciones = ${fid_organizaciones}::uuid
          AND estado = 1
      `;
      if (actualizadas !== 1) {
        throw new NotFoundException("profile.personal.notFound");
      }

      const actualizada = await tx.personas.findUniqueOrThrow({
        where: { id_personas: usuario.fid_personas },
        include: {
          admin_level_3_procedencia: { select: { codigo: true } },
          admin_level_3_residencia: { select: { codigo: true } },
        },
      });
      const persona = this.personaPublica(actualizada);
      const camposModificados = Object.keys(persona).filter(
        (campo) =>
          anterior[campo as keyof DatosPersonaPerfil] !==
          persona[campo as keyof DatosPersonaPerfil],
      );

      await this.auditoria.registrarConEvento(
        {
          accion:
            EVENTOS_FUNCIONALES.PERFIL_DATOS_PERSONALES_ACTUALIZADOS.codigo,
          entidad: "personas",
          id_entidad: usuario.fid_personas,
          fid_organizaciones,
          fid_usuarios: id_usuarios,
          peticion,
          metadatos: { campos_modificados: camposModificados },
        },
        tx,
      );

      return { ok: true, persona };
    });
  }

  async obtenerAvatar(
    id_usuarios: string,
    fid_organizaciones: string,
  ): Promise<AvatarPerfil> {
    const usuario = await this.prisma.usuarios.findFirst({
      where: {
        id_usuarios,
        fid_organizaciones,
        estado: 1,
        persona: { fid_organizaciones, estado: 1 },
      },
      select: { persona: { select: { foto_url: true } } },
    });
    if (!usuario?.persona.foto_url) {
      throw new NotFoundException("profile.avatar.notFound");
    }
    return this.avatares.leer(usuario.persona.foto_url);
  }

  async actualizarAvatar(
    id_usuarios: string,
    fid_organizaciones: string,
    archivo: ArchivoAvatarEntrada,
    peticion: ContextoSolicitud,
  ): Promise<{ ok: true; avatar: { version: string } }> {
    const nuevo = await this.avatares.guardar(
      fid_organizaciones,
      id_usuarios,
      archivo,
    );

    try {
      const anterior = await this.prisma.$transaction(async (tx) => {
        const idPersonas = await this.bloquearPersona(
          tx,
          id_usuarios,
          fid_organizaciones,
        );
        const persona = await tx.personas.findUniqueOrThrow({
          where: { id_personas: idPersonas },
          select: { foto_url: true },
        });

        await tx.personas.update({
          where: { id_personas: idPersonas },
          data: { foto_url: nuevo.clave, updated_by: id_usuarios },
        });
        await this.auditoria.registrarConEvento(
          {
            accion: EVENTOS_FUNCIONALES.PERFIL_AVATAR_ACTUALIZADO.codigo,
            entidad: "personas",
            id_entidad: idPersonas,
            fid_organizaciones,
            fid_usuarios: id_usuarios,
            peticion,
            metadatos: { reemplazo_avatar_anterior: Boolean(persona.foto_url) },
          },
          tx,
        );
        return persona.foto_url;
      });

      await this.avatares.eliminarSeguro(anterior);
      return {
        ok: true,
        avatar: { version: nuevo.clave.split("/").at(-1) ?? nuevo.clave },
      };
    } catch (error) {
      await this.avatares.eliminarSeguro(nuevo.clave);
      throw error;
    }
  }

  async eliminarAvatar(
    id_usuarios: string,
    fid_organizaciones: string,
    peticion: ContextoSolicitud,
  ): Promise<{ ok: true }> {
    const anterior = await this.prisma.$transaction(async (tx) => {
      const idPersonas = await this.bloquearPersona(
        tx,
        id_usuarios,
        fid_organizaciones,
      );
      const persona = await tx.personas.findUniqueOrThrow({
        where: { id_personas: idPersonas },
        select: { foto_url: true },
      });
      if (!persona.foto_url) {
        throw new BadRequestException("profile.avatar.notFound");
      }

      await tx.personas.update({
        where: { id_personas: idPersonas },
        data: { foto_url: null, updated_by: id_usuarios },
      });
      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.PERFIL_AVATAR_ELIMINADO.codigo,
          entidad: "personas",
          id_entidad: idPersonas,
          fid_organizaciones,
          fid_usuarios: id_usuarios,
          peticion,
        },
        tx,
      );
      return persona.foto_url;
    });

    await this.avatares.eliminarSeguro(anterior);
    return { ok: true };
  }

  /** Historial funcional del usuario autenticado, paginado y aislado por tenant. */
  async listarActividad(
    id_usuarios: string,
    fid_organizaciones: string,
    pagina: number,
    limite: number,
  ): Promise<PaginaActividadUsuario> {
    const where = {
      fid_usuarios: id_usuarios,
      fid_organizaciones,
      estado: 1,
      evento_maestro: { visible_actividad: true },
    } as const;
    const omitir = (pagina - 1) * limite;
    const cantidad = Math.min(
      limite,
      Math.max(0, MAXIMO_EVENTOS_ACTIVIDAD - omitir),
    );

    const [eventos, totalEncontrado, preferencias, ahora] = await Promise.all([
      this.prisma.eventos.findMany({
        where,
        // Solo se pagina dentro de los 500 eventos más recientes.
        orderBy: [{ ocurrido_en: "desc" }, { id_eventos: "desc" }],
        skip: omitir,
        take: cantidad,
        select: {
          id_eventos: true,
          ocurrido_en: true,
          metadatos: true,
          evento_maestro: { select: { codigo: true } },
        },
      }),
      this.prisma.eventos.count({ where }),
      this.prisma.preferencias_usuario.findUnique({
        where: { fid_usuarios: id_usuarios },
        select: {
          zona_horaria: { select: { nombre_iana: true, estado: true } },
        },
      }),
      this.reloj.ahora(),
    ]);

    const zona_horaria =
      preferencias?.zona_horaria?.estado === 1
        ? preferencias.zona_horaria.nombre_iana
        : "America/Lima";

    const total = Math.min(totalEncontrado, MAXIMO_EVENTOS_ACTIVIDAD);

    return {
      eventos: eventos.map((evento) => ({
        id_eventos: evento.id_eventos,
        tipo_evento: evento.evento_maestro.codigo,
        ocurrido_en: evento.ocurrido_en,
        agente_usuario: this.metadatoTexto(evento.metadatos, "agente_usuario"),
      })),
      paginacion: {
        pagina,
        limite,
        total,
        total_paginas: Math.ceil(total / limite),
      },
      zona_horaria,
      ahora,
    };
  }

  /** Catálogos, preferencias y auditoría confirman o revierten juntos. */
  async actualizarApariencia(
    id_usuarios: string,
    fid_organizaciones: string,
    dto: ComandoActualizarApariencia,
    peticion: ContextoSolicitud,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const pais = await tx.admin_level_0.findUnique({
        where: { id_admin_level_0: dto.fid_admin_level_0 },
        select: { id_admin_level_0: true, estado: true },
      });
      if (!pais || pais.estado !== 1) {
        throw new BadRequestException("preferences.invalidCountry");
      }

      const zonaHoraria = await tx.zonas_horarias.findUnique({
        where: { id_zonas_horarias: dto.fid_zonas_horarias },
        select: { id_zonas_horarias: true, estado: true },
      });
      if (!zonaHoraria || zonaHoraria.estado !== 1) {
        throw new BadRequestException("preferences.invalidTimezone");
      }

      const anterior = await tx.preferencias_usuario.findUnique({
        where: { fid_usuarios: id_usuarios },
        select: { fid_admin_level_0: true, fid_zonas_horarias: true },
      });

      const preferencias = await tx.preferencias_usuario.upsert({
        where: { fid_usuarios: id_usuarios },
        create: {
          fid_usuarios: id_usuarios,
          fid_admin_level_0: dto.fid_admin_level_0,
          fid_zonas_horarias: dto.fid_zonas_horarias,
          created_by: id_usuarios,
          updated_by: id_usuarios,
        },
        update: {
          fid_admin_level_0: dto.fid_admin_level_0,
          fid_zonas_horarias: dto.fid_zonas_horarias,
          estado: 1,
          updated_by: id_usuarios,
        },
        select: {
          id_preferencias_usuario: true,
          fid_admin_level_0: true,
          fid_zonas_horarias: true,
        },
      });

      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.PERFIL_APARIENCIA_ACTUALIZADA.codigo,
          entidad: "preferencias_usuario",
          id_entidad: preferencias.id_preferencias_usuario,
          fid_organizaciones,
          fid_usuarios: id_usuarios,
          peticion,
          metadatos: {
            anterior: {
              fid_admin_level_0: anterior?.fid_admin_level_0 ?? null,
              fid_zonas_horarias: anterior?.fid_zonas_horarias ?? null,
            },
            nuevo: {
              fid_admin_level_0: preferencias.fid_admin_level_0,
              fid_zonas_horarias: preferencias.fid_zonas_horarias,
            },
          },
        },
        tx,
      );

      return {
        ok: true as const,
        preferencias: {
          fid_admin_level_0: preferencias.fid_admin_level_0,
          fid_zonas_horarias: preferencias.fid_zonas_horarias,
        },
      };
    });
  }
}
