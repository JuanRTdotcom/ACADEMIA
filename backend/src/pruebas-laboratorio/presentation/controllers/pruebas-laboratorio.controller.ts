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
import { CasoUsoGestionarPruebasLaboratorio } from "../../domain/usecases/gestionar-pruebas-laboratorio";
import {
  DtoCambiarEstadoPruebaLaboratorio,
  DtoGuardarPruebaLaboratorio,
} from "../dto/pruebas-laboratorio.dto";

@Controller("company/laboratory-tests")
export class ControladorPruebasLaboratorio {
  constructor(private pruebas: CasoUsoGestionarPruebasLaboratorio) {}

  @Get()
  @Permisos("administrator.laboratory_tests.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listar(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.pruebas.listar(usuario.fid_organizaciones);
  }

  @Post()
  @Permisos("administrator.laboratory_tests.create")
  @HttpCode(201)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  crear(
    @Body() dto: DtoGuardarPruebaLaboratorio,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    return this.pruebas.crear(
      usuario.fid_organizaciones,
      dto,
      usuario.sub,
      crearContextoSolicitud(req),
    );
  }

  @Patch(":id")
  @Permisos("administrator.laboratory_tests.update")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async actualizar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoGuardarPruebaLaboratorio,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.pruebas.actualizar(
      id,
      usuario.fid_organizaciones,
      dto,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Patch(":id/status")
  @Permisos("administrator.laboratory_tests.update")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async estado(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoCambiarEstadoPruebaLaboratorio,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.pruebas.cambiarEstado(
      id,
      usuario.fid_organizaciones,
      dto.activo,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("administrator.laboratory_tests.delete")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async eliminar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.pruebas.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }
}
