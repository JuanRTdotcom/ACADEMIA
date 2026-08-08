import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import type { RefrescoConToken } from "../strategies/estrategia-refresco";

interface VentanaRefresco {
  cantidad: number;
  reinicia_en: number;
}

/**
 * Segundo límite del refresh, aplicado después de verificar el JWT. El límite
 * global de Nest controla IP; este controla la familia firmada para que varias
 * IP no puedan reiniciar el contador al rotar el sid.
 */
@Injectable()
export class GuardiaLimiteRefresco implements CanActivate {
  private readonly ventanas = new Map<string, VentanaRefresco>();

  constructor(private config: ConfigService) {}

  canActivate(contexto: ExecutionContext): boolean {
    const peticion = contexto.switchToHttp().getRequest<Request>();
    const usuario = peticion.user as RefrescoConToken | undefined;
    if (!usuario?.sid) {
      throw new HttpException("auth.sessionInvalid", HttpStatus.UNAUTHORIZED);
    }

    const limite = Number(this.config.getOrThrow("REFRESH_SESSION_RATE_LIMIT"));
    const ventanaMs =
      Number(this.config.getOrThrow("REFRESH_SESSION_RATE_WINDOW_SECONDS")) *
      1_000;
    const ahora = Date.now();
    // El sid es estable durante toda la vida de la sesión (la fila rota en sitio),
    // así que sirve de clave fija: rotar el token no reinicia el contador.
    const clave = usuario.sid;
    const existente = this.ventanas.get(clave);

    if (!existente || existente.reinicia_en <= ahora) {
      this.ventanas.set(clave, {
        cantidad: 1,
        reinicia_en: ahora + ventanaMs,
      });
      this.limpiarVencidas(ahora);
      return true;
    }

    existente.cantidad += 1;
    if (existente.cantidad > limite) {
      throw new HttpException(
        "auth.tooManyRefreshes",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  /** Limpieza perezosa: evita temporizadores y mantiene acotado el mapa. */
  private limpiarVencidas(ahora: number): void {
    if (this.ventanas.size < 1_000) return;
    for (const [sid, ventana] of this.ventanas) {
      if (ventana.reinicia_en <= ahora) this.ventanas.delete(sid);
    }
  }
}
