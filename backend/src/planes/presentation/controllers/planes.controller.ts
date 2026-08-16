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
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { Permisos } from "../../../autenticacion/presentation/decorators/permisos.decorador";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { resolverIdioma } from "../../../comun/i18n/resolver-idioma";
import { FuenteDatosPlanesPrisma } from "../../data/datasources/planes-prisma.datasource";
import {
  DtoGestionarPlan,
  DtoActualizarModulosPlan,
} from "../dto/gestionar-plan.dto";

const LIMITE_MUTACIONES = 20;

@Controller("plans")
export class ControladorPlanes {
  constructor(private planes: FuenteDatosPlanesPrisma) {}

  @Get()
  @Permisos("superadmin.plans.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listar() {
    return this.planes.listar();
  }

  @Get("storage-units")
  @Permisos("superadmin.plans.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  unidadesAlmacenamiento(@Req() peticion: Request) {
    return this.planes.unidadesAlmacenamiento(resolverIdioma(peticion));
  }

  @Get("creation-options")
  @Permisos("superadmin.plans.read", "superadmin.plans.create")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  opcionesCreacion() {
    return this.planes.opcionesCreacion();
  }

  @Get(":id")
  @Permisos("superadmin.plans.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  obtener(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.planes.obtener(id);
  }

  @Post()
  @Permisos("superadmin.plans.create")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(201)
  async crear(
    @Body() dto: DtoGestionarPlan,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.planes.crear(
      dto,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Patch(":id")
  @Permisos("superadmin.plans.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async actualizar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoGestionarPlan,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.planes.actualizar(
      id,
      dto,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Patch(":id/status")
  @Permisos("superadmin.plans.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async cambiarEstado(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: { activo: boolean },
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.planes.cambiarEstado(
      id,
      body.activo,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Patch(":id/modules")
  @Permisos("superadmin.plans.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async actualizarModulos(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoActualizarModulosPlan,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.planes.actualizarModulos(
      id,
      dto,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("superadmin.plans.delete")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async eliminar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.planes.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }
}
