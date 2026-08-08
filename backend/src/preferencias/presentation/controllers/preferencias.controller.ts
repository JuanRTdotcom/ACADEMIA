import { Body, Controller, Get, HttpCode, Patch, Req } from "@nestjs/common";
import type { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { DtoActualizarPreferencias } from "../dto/actualizar-preferencias.dto";
import { CasoUsoObtenerPreferencias } from "../../domain/usecases/obtener-preferencias";
import { CasoUsoActualizarPreferencias } from "../../domain/usecases/actualizar-preferencias";

/** Rutas de la cuenta actual; el guardia global exige una sesión válida. */
@Controller("preferences")
export class ControladorPreferencias {
  constructor(
    private obtenerPreferencias: CasoUsoObtenerPreferencias,
    private actualizarPreferencias: CasoUsoActualizarPreferencias,
  ) {}

  @Get()
  obtener(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.obtenerPreferencias.ejecutar(usuario.sub);
  }

  @Patch()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  actualizar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoActualizarPreferencias,
    @Req() peticion: Request,
  ) {
    return this.actualizarPreferencias.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }
}
