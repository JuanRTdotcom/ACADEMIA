import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common"; // NestJS: CanActivate = interfaz de guardia; ForbiddenException = HTTP 403; ExecutionContext = petición; Injectable = provider (DI)
import type { Request } from "express"; // Express: tipo de la petición HTTP

// Métodos que no cambian estado: no necesitan protección anti-CSRF.
const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

// Cabecera custom que debe acompañar a toda petición que muta estado. El front la
// envía siempre; un formulario cross-site NO puede añadir cabeceras custom, así que
// su ausencia delata un intento de CSRF. El valor es indiferente: basta su presencia.
export const CABECERA_CSRF = "x-sumaq-csrf";

/**
 * Defensa en profundidad contra CSRF para el API con cookies.
 * Exige la cabecera CABECERA_CSRF en métodos que mutan (POST/PUT/PATCH/DELETE).
 * Complementa SameSite=lax de las cookies y el CORS cerrado al front.
 */
@Injectable()
export class GuardiaCsrf implements CanActivate {
  canActivate(contexto: ExecutionContext): boolean {
    const peticion = contexto.switchToHttp().getRequest<Request>(); // NestJS: obtiene la Request de Express
    if (METODOS_SEGUROS.has(peticion.method)) return true;

    const cabecera = peticion.headers[CABECERA_CSRF];
    if (typeof cabecera === "string" && cabecera.length > 0) return true;

    throw new ForbiddenException("auth.csrfMissing");
  }
}
