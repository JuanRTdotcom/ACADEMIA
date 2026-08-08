import { Injectable } from "@nestjs/common"; // NestJS: permite inyectar este servicio mediante DI
import { ConfigService } from "@nestjs/config"; // NestJS: lee la configuración y variables de entorno
import type { CookieOptions, Response } from "express"; // Express: tipos para configurar y escribir cookies HTTP

/** Par de tokens que representan una sesión (definido aquí para no depender de un feature). */
export interface TokensSesion {
  tokenAcceso: string;
  tokenRefresco: string;
}

/**
 * Servicio transversal de cookies. Centraliza la política de seguridad y la escritura
 * de las cookies de sesión. Los controladores solo deciden CUÁNDO iniciar/limpiar una
 * sesión; este servicio decide CÓMO se escriben y cuánto duran.
 */
@Injectable()
export class ServicioCookies {
  constructor(private config: ConfigService) {}

  /** Opciones de seguridad compartidas por todas las cookies de sesión. */
  private opcionesBase(): CookieOptions {
    return {
      httpOnly: true, // impide que JavaScript del navegador lea el token
      secure: this.config.getOrThrow<string>("NODE_ENV") === "production", // HTTPS en producción
      sameSite: "lax", // reduce el riesgo de ataques CSRF entre sitios
      path: "/", // disponible en todas las rutas de la aplicación
    };
  }

  /** Escribe las cookies que representan una sesión autenticada. */
  ponerSesion(respuesta: Response, tokens: TokensSesion): void {
    const minutosAcceso = Number(
      this.config.getOrThrow("JWT_ACCESS_TTL_MINUTES"),
    );
    const horasRefresco = Number(
      this.config.getOrThrow("JWT_REFRESH_TTL_HOURS"),
    );

    respuesta.cookie("access_token", tokens.tokenAcceso, {
      ...this.opcionesBase(),
      maxAge: minutosAcceso * 60_000, // minutos → milisegundos
    });
    respuesta.cookie("refresh_token", tokens.tokenRefresco, {
      ...this.opcionesBase(),
      maxAge: horasRefresco * 3_600_000, // horas → milisegundos
    });
  }

  /** Expira las dos cookies de sesión durante el cierre de sesión. */
  limpiarSesion(respuesta: Response): void {
    respuesta.clearCookie("access_token", this.opcionesBase());
    respuesta.clearCookie("refresh_token", this.opcionesBase());
  }
}
