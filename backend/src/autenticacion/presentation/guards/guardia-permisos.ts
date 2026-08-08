import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common"; // NestJS: CanActivate = interfaz de guardia; ForbiddenException = respuesta HTTP 403; ExecutionContext = petición; Injectable = provider
import { Reflector } from "@nestjs/core"; // NestJS: lee la metadata que puso @Permisos
import { LLAVE_PERMISOS } from "../decorators/permisos.decorador";
import type { UsuarioAutenticado } from "../../domain/entities/tipos";
import type { Request } from "express";

/**
 * Guardia global de autorización por permisos.
 * Si la ruta declara @Permisos, exige que el usuario tenga TODOS los requeridos.
 * Los permisos vienen de PostgreSQL: la estrategia reemplaza los claims mutables
 * en cada petición antes de que este guardia se ejecute.
 */
@Injectable()
export class GuardiaPermisos implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<string[]>(
      LLAVE_PERMISOS,
      [
        contexto.getHandler(), // método de la ruta
        contexto.getClass(), // controlador
      ],
    );
    if (!requeridos || requeridos.length === 0) return true; // ruta sin @Permisos → libre

    const usuario = contexto
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioAutenticado }>().user; // req.user de la estrategia
    const tiene =
      !!usuario && requeridos.some((p) => usuario.permisos.includes(p));
    if (!tiene) throw new ForbiddenException("auth.noPermission");
    return true;
  }
}
