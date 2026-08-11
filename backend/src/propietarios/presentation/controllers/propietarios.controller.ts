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
  Query,
  Req,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { Permisos } from "../../../autenticacion/presentation/decorators/permisos.decorador";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { CasoUsoGestionarPropietarios } from "../../domain/usecases/gestionar-propietarios";
import { DtoGuardarPropietario } from "../dto/guardar-propietario.dto";
import { DtoListarPropietarios } from "../dto/listar-propietarios.dto";

@Controller("clinic/owners")
export class ControladorPropietarios {
  constructor(private propietarios: CasoUsoGestionarPropietarios) {}

  @Get()
  @Permisos("clinic.owners.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listar(
    @Query() filtros: DtoListarPropietarios,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.propietarios.listar(usuario.fid_organizaciones, filtros);
  }

  @Get("options")
  @Permisos("clinic.owners.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  opciones(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.propietarios.opciones(
      usuario.fid_organizaciones,
      usuario.idioma,
    );
  }

  @Get(":id")
  @Permisos("clinic.owners.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  obtener(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.propietarios.obtener(id, usuario.fid_organizaciones);
  }

  @Post()
  @Permisos("clinic.owners.create")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(201)
  async crear(
    @Body() dto: DtoGuardarPropietario,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    const resultado = await this.propietarios.crear(
      usuario.fid_organizaciones,
      this.datos(dto),
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true, ...resultado };
  }

  @Patch(":id")
  @Permisos("clinic.owners.update")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  async actualizar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoGuardarPropietario,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.propietarios.actualizar(
      id,
      usuario.fid_organizaciones,
      this.datos(dto),
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("clinic.owners.delete")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(200)
  async eliminar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.propietarios.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  private datos(dto: DtoGuardarPropietario) {
    return {
      fid_parametros_tipo_documento: dto.fid_parametros_tipo_documento,
      numero_documento: dto.numero_documento,
      nombre_completo: dto.nombre_completo,
      celular: dto.celular ?? null,
      celular_verificado: dto.celular_verificado ?? false,
      sin_correo: dto.sin_correo ?? false,
      correo: dto.sin_correo ? null : (dto.correo ?? null),
      correo_verificado: dto.correo_verificado ?? false,
      telefono_fijo: dto.telefono_fijo || null,
      direccion: dto.direccion ?? null,
      fid_admin_level_0: dto.fid_admin_level_0 ?? null,
      fid_admin_level_3: dto.fid_admin_level_3 ?? null,
      contacto_alternativo_nombre: dto.contacto_alternativo_nombre || null,
      contacto_alternativo_telefono: dto.contacto_alternativo_telefono || null,
      fid_parametros_como_conocio: dto.fid_parametros_como_conocio ?? null,
      como_conocio_otro: dto.como_conocio_otro || null,
    };
  }
}
