import { Injectable } from "@nestjs/common"; // NestJS: marca la clase como provider inyectable (DI)
import { AuthGuard } from "@nestjs/passport"; // NestJS: guardia base que ejecuta una estrategia Passport por nombre

/** Guardia para /auth/refresh: valida el token de refresco del cookie. */
@Injectable()
export class GuardiaRefresco extends AuthGuard("jwt-refresco") {} // usa la EstrategiaRefresco (nombre "jwt-refresco")
