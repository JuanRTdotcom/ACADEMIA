import {
  ArgumentsHost, // NestJS: acceso al contexto de la petición (HTTP aquí)
  Catch, // NestJS: marca la clase como filtro de excepciones
  ExceptionFilter, // NestJS: interfaz del filtro
  HttpException, // NestJS: excepciones con código HTTP conocido
  HttpStatus, // NestJS: enum de códigos HTTP
  Injectable,
  Logger, // NestJS: logger interno
} from "@nestjs/common";
import type { Request, Response } from "express"; // Express: tipos de petición y respuesta
import { resolverIdioma } from "../i18n/resolver-idioma";
import { ServicioTraduccion } from "../i18n/servicio-traduccion";

/**
 * Filtro global: intercepta TODA excepción y responde el mensaje ya traducido al
 * idioma de la petición. Los servicios lanzan un CÓDIGO (ej. "auth.invalidCredentials")
 * en vez del texto; aquí se traduce. Errores no controlados → 500 genérico + log.
 */
@Injectable()
@Catch()
export class FiltroExcepcionesI18n implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcepcionesI18n.name);

  constructor(private traduccion: ServicioTraduccion) {}

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const respuesta = contexto.getResponse<Response>();
    const peticion = contexto.getRequest<Request>();
    const idioma = resolverIdioma(peticion);

    let estado: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let codigo = "common.internalError";
    let detalles: string[] | undefined;
    // Valores para interpolar placeholders {clave} del mensaje traducido. Los
    // provee quien lanza la excepción, ej. el tope real de una colección.
    let argumentos: Record<string, string | number> | undefined;

    if (excepcion instanceof HttpException) {
      estado = excepcion.getStatus();
      const cuerpo = excepcion.getResponse();
      if (typeof cuerpo === "string") {
        codigo = cuerpo;
      } else if (cuerpo && typeof cuerpo === "object") {
        const mensaje = (cuerpo as { message?: unknown }).message;
        const args = (cuerpo as { args?: unknown }).args;
        if (args && typeof args === "object") {
          argumentos = args as Record<string, string | number>;
        }
        if (Array.isArray(mensaje)) {
          // Errores del ValidationPipe: se conservan tal cual como detalles.
          detalles = mensaje as string[];
          codigo = "common.validationError";
        } else if (typeof mensaje === "string") {
          codigo = mensaje;
        }
      }
    } else {
      // No es HttpException: fallo inesperado. Se loguea el detalle real, no se expone.
      this.logger.error(
        "Excepción no controlada",
        excepcion instanceof Error ? excepcion.stack : String(excepcion),
      );
    }

    const retryAfterHeader = respuesta.getHeader("Retry-After");
    const retryAfterSeconds =
      estado === Number(HttpStatus.TOO_MANY_REQUESTS) &&
      typeof retryAfterHeader !== "undefined"
        ? Number(retryAfterHeader)
        : undefined;
    let mensaje = this.traduccion.traducir(codigo, idioma);
    if (
      typeof retryAfterSeconds === "number" &&
      Number.isFinite(retryAfterSeconds)
    ) {
      mensaje = mensaje.replace("{seconds}", String(retryAfterSeconds));
    }
    if (argumentos) {
      for (const [clave, valor] of Object.entries(argumentos)) {
        mensaje = mensaje.replaceAll(`{${clave}}`, String(valor));
      }
    }

    respuesta.status(estado).json({
      statusCode: estado,
      codigo,
      message: mensaje,
      ...(typeof retryAfterSeconds === "number" &&
      Number.isFinite(retryAfterSeconds)
        ? { retry_after_seconds: retryAfterSeconds }
        : {}),
      ...(detalles ? { detalles } : {}),
    });
  }
}
