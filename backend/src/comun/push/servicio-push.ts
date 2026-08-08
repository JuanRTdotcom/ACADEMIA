import { Injectable, Logger, OnModuleInit } from "@nestjs/common"; // NestJS: DI, logger y hook de arranque
import { ConfigService } from "@nestjs/config"; // NestJS: lee variables de entorno
import { cert, getApps, initializeApp } from "firebase-admin/app"; // Firebase Admin: init de la app + credenciales
import { getMessaging } from "firebase-admin/messaging"; // Firebase Admin: envío de notificaciones (FCM)
import { PrismaService } from "../prisma.service";

/** Contenido de una notificación push. */
export interface Notificacion {
  titulo: string;
  cuerpo: string;
  datos?: Record<string, string>; // payload extra opcional (se lee en el cliente)
}

/**
 * Servicio transversal de notificaciones push (Firebase Cloud Messaging).
 *
 * Se inicializa SOLO si están las 3 variables de entorno de Firebase. Si faltan
 * (aún no configurado), queda deshabilitado y sus métodos son no-op: la app corre
 * normal sin push. Al poner las env vars, se activa sin tocar código.
 */
@Injectable()
export class ServicioPush implements OnModuleInit {
  private readonly logger = new Logger(ServicioPush.name);
  private habilitado = false;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    const projectId = this.config.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = this.config.get<string>("FIREBASE_CLIENT_EMAIL");
    // La clave privada llega con "\n" escapados en la env; se restauran a saltos reales.
    const privateKey = this.config
      .get<string>("FIREBASE_PRIVATE_KEY")
      ?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        "Push deshabilitado: faltan variables FIREBASE_* (se activa al configurarlas).",
      );
      return;
    }

    // initializeApp una sola vez; evita re-inicializar en hot-reload de desarrollo.
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    }
    this.habilitado = true;
    this.logger.log("Push habilitado (Firebase Cloud Messaging).");
  }

  /** Envía a un token concreto. Devuelve true si se entregó; false si falló o está deshabilitado. */
  async enviarADispositivo(
    token: string,
    notificacion: Notificacion,
  ): Promise<boolean> {
    if (!this.habilitado) return false;
    try {
      await getMessaging().send({
        token,
        notification: { title: notificacion.titulo, body: notificacion.cuerpo },
        data: notificacion.datos,
      });
      return true;
    } catch (error) {
      // Token inválido/expirado → se limpia para no reintentar contra una dirección muerta.
      if (this.esTokenInvalido(error)) {
        await this.prisma.dispositivos.updateMany({
          where: { firebase_token_fcm: token },
          data: { firebase_token_fcm: null },
        });
      } else {
        this.logger.error("Fallo al enviar push", String(error));
      }
      return false;
    }
  }

  /** Notifica a TODOS los dispositivos activos del usuario que tengan token push. */
  async notificarUsuario(
    id_usuarios: string,
    notificacion: Notificacion,
  ): Promise<void> {
    if (!this.habilitado) return;
    const dispositivos = await this.prisma.dispositivos.findMany({
      where: {
        fid_usuarios: id_usuarios,
        estado: 1,
        firebase_token_fcm: { not: null },
      },
      select: { firebase_token_fcm: true },
    });
    await Promise.all(
      dispositivos.map((d) =>
        this.enviarADispositivo(d.firebase_token_fcm as string, notificacion),
      ),
    );
  }

  /** Detecta los errores de FCM que indican un token ya no válido. */
  private esTokenInvalido(error: unknown): boolean {
    const codigo = (error as { code?: string })?.code ?? "";
    return (
      codigo === "messaging/registration-token-not-registered" ||
      codigo === "messaging/invalid-registration-token"
    );
  }
}
