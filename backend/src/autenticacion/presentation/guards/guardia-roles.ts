import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"; // NestJS: CanActivate = interfaz de guardia; ExecutionContext = petición actual; Injectable = provider (DI)
import { Reflector } from "@nestjs/core"; // NestJS: lee la metadata que puso @Roles
import { LLAVE_ROLES } from "../decorators/roles.decorador";
import type { UsuarioAutenticado } from "../../domain/entities/tipos";
import type { Request } from "express";

/** Guardia global: si la ruta declara @Roles, exige que el usuario tenga uno. */
@Injectable()
export class GuardiaRoles implements CanActivate {
  // implements CanActivate: Nest llama canActivate() para decidir si deja pasar la petición
  constructor(private reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<string[]>(LLAVE_ROLES, [
      contexto.getHandler(), // método de la ruta
      contexto.getClass(), // controlador
    ]);
    if (!requeridos || requeridos.length === 0) return true; // ruta sin @Roles → libre

    const usuario = contexto
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioAutenticado }>().user; // req.user lo dejó la estrategia de acceso
    return !!usuario && usuario.roles.some((rol) => requeridos.includes(rol)); // basta con tener UNO de los roles
  }
}
