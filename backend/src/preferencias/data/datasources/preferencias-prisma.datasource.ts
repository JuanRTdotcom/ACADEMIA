import { BadRequestException, Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import { PrismaService } from "../../../comun/prisma.service";
import type { ComandoActualizarPreferencias } from "../../domain/entities/comando-actualizar-preferencias";

@Injectable()
export class FuenteDatosPreferenciasPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  /** Una respuesta estable aunque el usuario todavía no tenga fila de preferencias. */
  async obtener(id_usuarios: string) {
    const preferencias = await this.prisma.preferencias_usuario.findUnique({
      where: { fid_usuarios: id_usuarios },
      select: {
        tema: true,
        idioma: true,
        menu_colapsado: true,
        fid_admin_level_0: true,
        fid_zonas_horarias: true,
      },
    });

    return {
      tema: preferencias?.tema ?? null,
      idioma: preferencias?.idioma ?? null,
      menu_colapsado: preferencias?.menu_colapsado ?? false,
      fid_admin_level_0: preferencias?.fid_admin_level_0 ?? null,
      fid_zonas_horarias: preferencias?.fid_zonas_horarias ?? null,
    };
  }

  /**
   * Upsert evita que el cliente tenga que saber si la fila ya existe:
   * la crea en el primer cambio y la actualiza en los siguientes.
   */
  async actualizar(
    id_usuarios: string,
    fid_organizaciones: string,
    dto: ComandoActualizarPreferencias,
    peticion: ContextoSolicitud,
  ) {
    if (
      dto.tema === undefined &&
      dto.idioma === undefined &&
      dto.menu_colapsado === undefined
    ) {
      throw new BadRequestException("preferences.emptyUpdate");
    }

    const cambios = {
      ...(dto.tema !== undefined ? { tema: dto.tema } : {}),
      ...(dto.idioma !== undefined ? { idioma: dto.idioma } : {}),
      ...(dto.menu_colapsado !== undefined
        ? { menu_colapsado: dto.menu_colapsado }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const anterior = await tx.preferencias_usuario.findUnique({
        where: { fid_usuarios: id_usuarios },
        select: {
          tema: true,
          idioma: true,
          menu_colapsado: true,
        },
      });

      const preferencias = await tx.preferencias_usuario.upsert({
        where: { fid_usuarios: id_usuarios },
        create: {
          fid_usuarios: id_usuarios,
          ...cambios,
          created_by: id_usuarios,
          updated_by: id_usuarios,
        },
        update: {
          ...cambios,
          estado: 1,
          updated_by: id_usuarios,
        },
        select: {
          id_preferencias_usuario: true,
          tema: true,
          idioma: true,
          menu_colapsado: true,
          fid_admin_level_0: true,
          fid_zonas_horarias: true,
        },
      });

      // Preferencias rápidas son cambios técnicos de interfaz: se auditan, pero no
      // forman parte del historial funcional visible para el usuario.
      await this.auditoria.registrar(
        {
          accion: "preferencias.usuario.actualizada",
          entidad: "preferencias_usuario",
          id_entidad: preferencias.id_preferencias_usuario,
          fid_organizaciones,
          fid_usuarios: id_usuarios,
          peticion,
          metadatos: {
            campos: Object.keys(cambios),
            anterior: anterior ?? null,
            nuevo: {
              tema: preferencias.tema,
              idioma: preferencias.idioma,
              menu_colapsado: preferencias.menu_colapsado,
            },
          },
        },
        tx,
      );

      return {
        tema: preferencias.tema,
        idioma: preferencias.idioma,
        menu_colapsado: preferencias.menu_colapsado,
        fid_admin_level_0: preferencias.fid_admin_level_0,
        fid_zonas_horarias: preferencias.fid_zonas_horarias,
      };
    });
  }
}
