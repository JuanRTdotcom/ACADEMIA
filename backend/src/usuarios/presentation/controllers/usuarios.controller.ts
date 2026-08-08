import { BadRequestException, Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, StreamableFile } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { Permisos } from "../../../autenticacion/presentation/decorators/permisos.decorador";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { CasoUsoGestionarUsuarios } from "../../domain/usecases/gestionar-usuarios";
import { DtoCambiarEstadoUsuario } from "../dto/cambiar-estado-usuario.dto";
import { DtoCrearUsuario, DtoGuardarUsuario } from "../dto/guardar-usuario.dto";
import { DtoListarUsuarios } from "../dto/listar-usuarios.dto";
import { DtoReiniciarContraseniaUsuario } from "../dto/reiniciar-contrasenia-usuario.dto";

const LIMITE_MUTACIONES = 20;
@Controller("users")
export class ControladorUsuarios {
  constructor(private readonly usuarios: CasoUsoGestionarUsuarios, private readonly configuracion: ConfigService) {}

  @Get()
  @Permisos("superadmin.users.read", "superadmin.users.create", "superadmin.users.update", "superadmin.users.delete", "systemUsers.read", "systemUsers.manage")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listar(@Query() query: DtoListarUsuarios) { return this.usuarios.listar(query.q ?? ""); }

  @Get("creation-options")
  @Permisos("superadmin.users.read", "superadmin.users.create", "superadmin.users.update", "systemUsers.read", "systemUsers.manage")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  opciones() { return this.usuarios.opciones(); }

  @Get(":id/avatar/:version")
  @Permisos(
    "superadmin.users.read",
    "systemUsers.read",
    "systemUsers.manage",
    "administrator.users.read",
    "administrator.users.update",
    "administrator.users.delete",
  )
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async avatarVersionado(@Param("id", new ParseUUIDPipe()) id: string, @Param("version") version: string, @UsuarioActual() actor: UsuarioAutenticado, @Res({ passthrough: true }) respuesta: Response) {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.jpg$/i.test(version)) throw new NotFoundException("profile.avatar.notFound");
    const avatar = await this.usuarios.obtenerAvatar(id, actor.sub);
    const versionActual = avatar.version.split("/").at(-1) ?? avatar.version;
    if (versionActual !== version) throw new NotFoundException("profile.avatar.notFound");
    respuesta.setHeader("content-type", avatar.tipo_mime);
    respuesta.setHeader("cache-control", "private, max-age=31536000, immutable");
    respuesta.setHeader("etag", `\"${versionActual}\"`);
    respuesta.setHeader("x-content-type-options", "nosniff");
    respuesta.setHeader("content-disposition", 'inline; filename="avatar.jpg"');
    respuesta.setHeader("cross-origin-resource-policy", "same-origin");
    respuesta.setHeader("content-security-policy", "default-src 'none'; sandbox");
    return new StreamableFile(avatar.contenido);
  }

  @Get(":id/avatar")
  @Permisos(
    "superadmin.users.read",
    "systemUsers.read",
    "systemUsers.manage",
    "administrator.users.read",
    "administrator.users.update",
    "administrator.users.delete",
  )
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async avatar(@Param("id", new ParseUUIDPipe()) id: string, @UsuarioActual() actor: UsuarioAutenticado, @Res({ passthrough: true }) respuesta: Response) {
    const avatar = await this.usuarios.obtenerAvatar(id, actor.sub);
    const version = avatar.version.split("/").at(-1) ?? avatar.version;
    respuesta.setHeader("content-type", avatar.tipo_mime);
    respuesta.setHeader("cache-control", `private, max-age=${this.configuracion.getOrThrow<number>("AVATAR_CACHE_TTL_SECONDS")}, immutable`);
    respuesta.setHeader("etag", `\"${version}\"`);
    respuesta.setHeader("x-content-type-options", "nosniff");
    respuesta.setHeader("content-disposition", 'inline; filename="avatar.jpg"');
    respuesta.setHeader("cross-origin-resource-policy", "same-origin");
    respuesta.setHeader("content-security-policy", "default-src 'none'; sandbox");
    return new StreamableFile(avatar.contenido);
  }

  @Get(":id")
  @Permisos("superadmin.users.read", "superadmin.users.update", "systemUsers.read", "systemUsers.manage")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  obtener(@Param("id", new ParseUUIDPipe()) id: string, @UsuarioActual() actor: UsuarioAutenticado) { return this.usuarios.obtener(id, actor.sub); }

  @Post()
  @Permisos("superadmin.users.create", "systemUsers.manage")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(201)
  async crear(@Body() dto: DtoCrearUsuario, @UsuarioActual() actor: UsuarioAutenticado, @Req() req: Request) {
    if (dto.contrasenia_temporal !== dto.confirmacion_contrasenia) throw new BadRequestException("users.passwordMismatch");
    await this.usuarios.crear({ ...dto }, actor.sub, crearContextoSolicitud(req)); return { ok: true };
  }

  @Patch(":id")
  @Permisos("superadmin.users.update", "systemUsers.manage")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async actualizar(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: DtoGuardarUsuario, @UsuarioActual() actor: UsuarioAutenticado, @Req() req: Request) { await this.usuarios.actualizar(id, dto, actor.sub, crearContextoSolicitud(req)); return { ok: true }; }

  @Patch(":id/status")
  @Permisos("superadmin.users.update", "systemUsers.manage")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async estado(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: DtoCambiarEstadoUsuario, @UsuarioActual() actor: UsuarioAutenticado, @Req() req: Request) { await this.usuarios.cambiarEstado(id, dto.activo, actor.sub, crearContextoSolicitud(req)); return { ok: true }; }

  @Patch(":id/reset-password")
  @Permisos("superadmin.users.update", "systemUsers.manage")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async reiniciarContrasenia(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: DtoReiniciarContraseniaUsuario, @UsuarioActual() actor: UsuarioAutenticado, @Req() req: Request) { await this.usuarios.reiniciarContrasenia(id, dto.contrasenia_nueva, actor.sub, crearContextoSolicitud(req)); return { ok: true }; }

  @Delete(":id")
  @Permisos("superadmin.users.delete", "systemUsers.manage")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async eliminar(@Param("id", new ParseUUIDPipe()) id: string, @UsuarioActual() actor: UsuarioAutenticado, @Req() req: Request) { await this.usuarios.eliminar(id, actor.sub, crearContextoSolicitud(req)); return { ok: true }; }
}
