import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
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
import { PrismaService } from "../../../comun/prisma.service";
import { CasoUsoGestionarUsuarios } from "../../domain/usecases/gestionar-usuarios";
import { DtoCambiarEstadoUsuario } from "../dto/cambiar-estado-usuario.dto";
import { DtoCrearUsuario, DtoGuardarUsuario } from "../dto/guardar-usuario.dto";
import { DtoListarUsuarios } from "../dto/listar-usuarios.dto";
import { DtoReiniciarContraseniaUsuario } from "../dto/reiniciar-contrasenia-usuario.dto";

const LIMITE_MUTACIONES = 20;

@Controller("company/current/users")
export class ControladorEmpresaUsuarios {
  constructor(
    private readonly usuarios: CasoUsoGestionarUsuarios,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Permisos(
    "administrator.users.read",
    "administrator.users.create",
    "administrator.users.update",
    "administrator.users.delete",
  )
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listar(
    @Query() query: DtoListarUsuarios,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.usuarios.listarDeEmpresa(actor.fid_organizaciones, query.q ?? "");
  }

  @Get("creation-options")
  @Permisos(
    "administrator.users.read",
    "administrator.users.create",
    "administrator.users.update",
  )
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  opciones() {
    return this.usuarios.opcionesDeEmpresa();
  }

  @Get(":id")
  @Permisos("administrator.users.read", "administrator.users.update")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async obtener(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    const usuario = await this.usuarios.obtener(id, actor.sub);
    if (usuario.fid_organizaciones !== actor.fid_organizaciones) {
      throw new NotFoundException("users.notFound");
    }
    return usuario;
  }

  @Post()
  @Permisos("administrator.users.create")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(201)
  async crear(
    @Body() dto: DtoCrearUsuario,
    @UsuarioActual() actor: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    dto.fid_organizaciones = actor.fid_organizaciones;

    // Validar que no se intente asignar SUPERADMIN
    const superadminRole = await this.prisma.roles.findFirst({
      where: { codigo: "SUPERADMIN" },
    });
    if (superadminRole && dto.fid_roles.includes(superadminRole.id_roles)) {
      throw new BadRequestException("users.invalidRoles");
    }

    if (dto.contrasenia_temporal !== dto.confirmacion_contrasenia) {
      throw new BadRequestException("users.passwordMismatch");
    }

    await this.usuarios.crear({ ...dto }, actor.sub, crearContextoSolicitud(req));
    return { ok: true };
  }

  @Patch(":id")
  @Permisos("administrator.users.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async actualizar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoGuardarUsuario,
    @UsuarioActual() actor: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    const usuario = await this.prisma.usuarios.findFirst({
      where: { id_usuarios: id, eliminado_en: null },
    });
    if (!usuario || usuario.fid_organizaciones !== actor.fid_organizaciones) {
      throw new NotFoundException("users.notFound");
    }

    dto.fid_organizaciones = actor.fid_organizaciones;

    // Validar que no se intente asignar SUPERADMIN
    const superadminRole = await this.prisma.roles.findFirst({
      where: { codigo: "SUPERADMIN" },
    });
    if (superadminRole && dto.fid_roles.includes(superadminRole.id_roles)) {
      throw new BadRequestException("users.invalidRoles");
    }

    await this.usuarios.actualizar(
      id,
      dto,
      actor.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Patch(":id/status")
  @Permisos("administrator.users.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async estado(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoCambiarEstadoUsuario,
    @UsuarioActual() actor: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    const usuario = await this.prisma.usuarios.findFirst({
      where: { id_usuarios: id, eliminado_en: null },
    });
    if (!usuario || usuario.fid_organizaciones !== actor.fid_organizaciones) {
      throw new NotFoundException("users.notFound");
    }

    await this.usuarios.cambiarEstado(
      id,
      dto.activo,
      actor.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Patch(":id/reset-password")
  @Permisos("administrator.users.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async reiniciarContrasenia(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoReiniciarContraseniaUsuario,
    @UsuarioActual() actor: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    const usuario = await this.prisma.usuarios.findFirst({
      where: { id_usuarios: id, eliminado_en: null },
    });
    if (!usuario || usuario.fid_organizaciones !== actor.fid_organizaciones) {
      throw new NotFoundException("users.notFound");
    }

    await this.usuarios.reiniciarContrasenia(
      id,
      dto.contrasenia_nueva,
      actor.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("administrator.users.delete")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async eliminar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() actor: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    const usuario = await this.prisma.usuarios.findFirst({
      where: { id_usuarios: id, eliminado_en: null },
    });
    if (!usuario || usuario.fid_organizaciones !== actor.fid_organizaciones) {
      throw new NotFoundException("users.notFound");
    }

    await this.usuarios.eliminar(id, actor.sub, crearContextoSolicitud(req));
    return { ok: true };
  }
}
