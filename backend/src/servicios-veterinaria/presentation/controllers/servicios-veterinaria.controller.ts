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
import { CasoUsoGestionarServiciosVeterinaria } from "../../domain/usecases/gestionar-servicios-veterinaria";
import { DtoCambiarEstadoServicioVeterinaria } from "../dto/cambiar-estado-servicio-veterinaria.dto";
import { DtoGuardarServicioVeterinaria } from "../dto/guardar-servicio-veterinaria.dto";

const LIMITE_MUTACIONES = 20;

@Controller("company/services")
export class ControladorServiciosVeterinaria {
  constructor(private servicios: CasoUsoGestionarServiciosVeterinaria) {}

  @Get()
  @Permisos("administrator.services.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listar(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.servicios.listar(usuario.fid_organizaciones);
  }

  @Get(":id")
  @Permisos("administrator.services.read", "administrator.services.update")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  obtener(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.servicios.obtener(id, usuario.fid_organizaciones);
  }

  @Post()
  @Permisos("administrator.services.create")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(201)
  async crear(
    @Body() dto: DtoGuardarServicioVeterinaria,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.servicios.crear(
      usuario.fid_organizaciones,
      {
        nombre: dto.nombre,
        descripcion: dto.descripcion || null,
        precio: dto.precio || null,
      },
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Patch(":id")
  @Permisos("administrator.services.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async actualizar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoGuardarServicioVeterinaria,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.servicios.actualizar(
      id,
      usuario.fid_organizaciones,
      {
        nombre: dto.nombre,
        descripcion: dto.descripcion || null,
        precio: dto.precio || null,
      },
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Patch(":id/status")
  @Permisos("administrator.services.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async cambiarEstado(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoCambiarEstadoServicioVeterinaria,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.servicios.cambiarEstado(
      id,
      usuario.fid_organizaciones,
      dto.activo,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("administrator.services.delete")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async eliminar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.servicios.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }
}
