import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common"; // NestJS: decoradores de ruta/parámetros
import type { Request } from "express";
import { CasoUsoRegistrarCliente } from "../../domain/usecases/registrar-cliente";
import { CasoUsoRegistrarTokenPush } from "../../domain/usecases/registrar-token-push";
import { DtoRegistrarTokenPush } from "../dto/registrar-token-push.dto";
import { DtoRegistrarCliente } from "../dto/registrar-cliente.dto";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";

@Controller("devices") // prefijo de ruta: /devices/*
export class ControladorDispositivos {
  constructor(
    private registrarClienteCasoUso: CasoUsoRegistrarCliente,
    private registrarTokenPushCasoUso: CasoUsoRegistrarTokenPush,
  ) {}

  // Identifica la instalación Firebase sin solicitar permisos de notificación.
  @Post("client-info")
  @HttpCode(200)
  async registrarCliente(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoRegistrarCliente,
    @Req() peticion: Request,
  ) {
    return this.registrarClienteCasoUso.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  // Protegido por el guardia global de acceso (no es @Publico): requiere sesión.
  @Post("push-token")
  @HttpCode(200)
  async registrarTokenPush(
    @UsuarioActual() usuario: UsuarioAutenticado, // usuario del JWT
    @Body() dto: DtoRegistrarTokenPush,
  ) {
    return this.registrarTokenPushCasoUso.ejecutar(
      usuario.sub,
      dto.uid_dispositivo,
      dto.firebase_token_fcm,
    );
  }
}
