import { createParamDecorator, ExecutionContext } from "@nestjs/common"; // NestJS: createParamDecorator crea un decorador de parámetro; ExecutionContext da acceso a la petición actual
import type { UsuarioAutenticado } from "../../domain/entities/tipos";
import type { Request } from "express";

/** Inyecta el usuario autenticado: metodo(@UsuarioActual() usuario: UsuarioAutenticado). */
export const UsuarioActual = createParamDecorator(
  (
    dato: keyof UsuarioAutenticado | undefined,
    contexto: ExecutionContext,
  ): UsuarioAutenticado | UsuarioAutenticado[keyof UsuarioAutenticado] => {
    const peticion = contexto
      .switchToHttp()
      .getRequest<Request & { user: UsuarioAutenticado }>();
    const usuario = peticion.user; // req.user lo dejó la estrategia Passport tras validar el token
    return dato ? usuario?.[dato] : usuario;
  },
);
