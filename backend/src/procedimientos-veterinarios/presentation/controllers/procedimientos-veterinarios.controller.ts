import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { Permisos } from "../../../autenticacion/presentation/decorators/permisos.decorador";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { CasoUsoGestionarProcedimientosVeterinarios } from "../../domain/usecases/gestionar-procedimientos-veterinarios";
import {
  DtoCambiarEstadoProcedimientoVeterinario,
  DtoGuardarProcedimientoVeterinario,
} from "../dto/procedimientos-veterinarios.dto";

@Controller("company/procedures")
export class ControladorProcedimientosVeterinarios {
  constructor(private tipos: CasoUsoGestionarProcedimientosVeterinarios) {}

  @Get()
  @Permisos("administrator.procedures.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listar(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.tipos.listar(usuario.fid_organizaciones);
  }

  @Post()
  @Permisos("administrator.procedures.create")
  @HttpCode(201)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  crear(
    @Body() dto: DtoGuardarProcedimientoVeterinario,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    return this.tipos.crear(
      usuario.fid_organizaciones,
      { nombre: dto.nombre, descripcion_guia: dto.descripcion_guia },
      usuario.sub,
      crearContextoSolicitud(req),
    );
  }

  @Patch(":id")
  @Permisos("administrator.procedures.update")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async actualizar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoGuardarProcedimientoVeterinario,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.tipos.actualizar(
      id,
      usuario.fid_organizaciones,
      { nombre: dto.nombre, descripcion_guia: dto.descripcion_guia },
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Patch(":id/status")
  @Permisos("administrator.procedures.update")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async estado(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoCambiarEstadoProcedimientoVeterinario,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.tipos.cambiarEstado(
      id,
      usuario.fid_organizaciones,
      dto.activo,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("administrator.procedures.delete")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async eliminar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.tipos.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }
}
