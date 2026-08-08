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
import { CasoUsoGestionarRoles } from "../../domain/usecases/gestionar-roles";
import { DtoCambiarEstadoRol } from "../dto/cambiar-estado-rol.dto";
import { DtoGuardarRol } from "../dto/guardar-rol.dto";
import { DtoGuardarPermisosRol } from "../dto/guardar-permisos-rol.dto";

const LIMITE_MUTACIONES = 20;

@Controller("roles")
export class ControladorRoles {
  constructor(private roles: CasoUsoGestionarRoles) {}

  @Get()
  @Permisos("superadmin.roles.read", "roles.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listar(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.roles.listar(usuario.fid_organizaciones);
  }

  /** Lectura SSR para la llave. */
  @Get(":id/permissions")
  @Permisos("superadmin.roles.read", "superadmin.roles.assign", "roles.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  catalogoPermisos(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.roles.catalogoPermisos(id, usuario.fid_organizaciones);
  }

  @Patch(":id/permissions")
  @Permisos("superadmin.roles.assign", "superadmin.roles.update", "roles.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async guardarPermisos(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoGuardarPermisosRol,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.roles.guardarPermisos(
      id,
      dto.permisos,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Post()
  @Permisos("superadmin.roles.create", "roles.create")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(201)
  async crear(
    @Body() dto: DtoGuardarRol,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.roles.crear(
      dto,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Patch(":id")
  @Permisos("superadmin.roles.update", "roles.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async actualizar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoGuardarRol,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.roles.actualizar(
      id,
      dto,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Patch(":id/status")
  @Permisos("superadmin.roles.update", "roles.update", "superadmin.roles.status")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async cambiarEstado(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoCambiarEstadoRol,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.roles.cambiarEstado(
      id,
      dto.activo,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("superadmin.roles.delete", "roles.delete")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async eliminar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.roles.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }
}
