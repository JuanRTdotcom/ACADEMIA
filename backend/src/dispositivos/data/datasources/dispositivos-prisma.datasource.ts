import { Injectable } from "@nestjs/common"; // NestJS: provider inyectable (DI)
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import { PrismaService } from "../../../comun/prisma.service";
import type { ComandoRegistrarCliente } from "../../domain/entities/comando-registrar-cliente";

@Injectable()
export class FuenteDatosDispositivosPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  /** Completa el dispositivo creado en login; firebase_token_fcm permanece intacto. */
  async registrarCliente(
    id_usuarios: string,
    fid_organizaciones: string,
    dto: ComandoRegistrarCliente,
    peticion: ContextoSolicitud,
  ): Promise<{ actualizado: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const dispositivo = await tx.dispositivos.findUnique({
        where: {
          fid_usuarios_uid_dispositivo: {
            fid_usuarios: id_usuarios,
            uid_dispositivo: dto.uid_dispositivo,
          },
        },
        select: {
          id_dispositivos: true,
          estado: true,
          firebase_id_instalacion: true,
          tipo_dispositivo: true,
          modelo: true,
          version_so: true,
          version_app: true,
        },
      });
      if (!dispositivo || dispositivo.estado !== 1) {
        return { actualizado: false };
      }

      const nuevos = {
        firebase_id_instalacion: dto.firebase_id_instalacion,
        tipo_dispositivo: dto.tipo_dispositivo,
        modelo: dto.modelo ?? null,
        version_so: dto.version_so ?? null,
        version_app: dto.version_app,
      };
      const cambio = Object.entries(nuevos).some(
        ([campo, valor]) => dispositivo[campo as keyof typeof nuevos] !== valor,
      );
      if (!cambio) return { actualizado: true };

      await tx.dispositivos.update({
        where: { id_dispositivos: dispositivo.id_dispositivos },
        data: { ...nuevos, updated_by: id_usuarios },
      });

      await this.auditoria.registrar(
        {
          accion: "dispositivos.cliente.actualizado",
          entidad: "dispositivos",
          id_entidad: dispositivo.id_dispositivos,
          fid_organizaciones,
          fid_usuarios: id_usuarios,
          peticion,
          // Nunca guardar identificadores Firebase ni detalles del equipo en historial.
          metadatos: { campos: Object.keys(nuevos) },
        },
        tx,
      );

      return { actualizado: true };
    });
  }

  /**
   * Guarda/actualiza el token push del dispositivo del usuario. El dispositivo se
   * identifica por (usuario + uid); ya existe porque se crea en el login. Devuelve
   * cuántas filas se actualizaron (0 si el dispositivo aún no está registrado).
   */
  async registrarTokenPush(
    id_usuarios: string,
    uid_dispositivo: string,
    firebase_token_fcm: string,
  ): Promise<{ actualizado: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const dispositivo = await tx.dispositivos.findUnique({
        where: {
          fid_usuarios_uid_dispositivo: {
            fid_usuarios: id_usuarios,
            uid_dispositivo,
          },
        },
        select: {
          id_dispositivos: true,
          estado: true,
          firebase_token_fcm: true,
        },
      });
      if (!dispositivo || dispositivo.estado !== 1) {
        return { actualizado: false };
      }
      if (dispositivo.firebase_token_fcm === firebase_token_fcm) {
        return { actualizado: true };
      }

      await tx.dispositivos.update({
        where: { id_dispositivos: dispositivo.id_dispositivos },
        data: { firebase_token_fcm, updated_by: id_usuarios },
      });

      return { actualizado: true };
    });
  }
}
