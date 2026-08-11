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
import { CasoUsoGestionarMotivosConsulta } from "../../domain/usecases/gestionar-motivos-consulta";
import {
  DtoCambiarEstadoMotivoConsulta,
  DtoGuardarMotivoConsulta,
} from "../dto/motivos-consulta.dto";

@Controller("company/consultation-reasons")
export class ControladorMotivosConsulta {
  constructor(private motivos: CasoUsoGestionarMotivosConsulta) {}
  @Get()
  @Permisos("administrator.consultation_reasons.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listar(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.motivos.listar(usuario.fid_organizaciones);
  }
  @Post()
  @Permisos("administrator.consultation_reasons.create")
  @HttpCode(201)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async crear(
    @Body() dto: DtoGuardarMotivoConsulta,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    return this.motivos.crear(
      usuario.fid_organizaciones,
      { nombre: dto.nombre, descripcion: dto.descripcion || null },
      usuario.sub,
      crearContextoSolicitud(req),
    );
  }
  @Patch(":id")
  @Permisos("administrator.consultation_reasons.update")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async actualizar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoGuardarMotivoConsulta,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.motivos.actualizar(
      id,
      usuario.fid_organizaciones,
      { nombre: dto.nombre, descripcion: dto.descripcion || null },
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }
  @Patch(":id/status")
  @Permisos("administrator.consultation_reasons.update")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async estado(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoCambiarEstadoMotivoConsulta,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.motivos.cambiarEstado(
      id,
      usuario.fid_organizaciones,
      dto.activo,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }
  @Delete(":id")
  @Permisos("administrator.consultation_reasons.delete")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async eliminar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.motivos.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }
}
