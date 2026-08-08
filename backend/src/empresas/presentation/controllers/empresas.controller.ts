import {
  BadRequestException,
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
  Res,
  StreamableFile,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { Permisos } from "../../../autenticacion/presentation/decorators/permisos.decorador";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { parseDateInTimezone } from "../../../comun/fechas";
import { CasoUsoCambiarEstadoEmpresa } from "../../domain/usecases/cambiar-estado-empresa";
import { CasoUsoActualizarEmpresa } from "../../domain/usecases/actualizar-empresa";
import { CasoUsoCrearEmpresa } from "../../domain/usecases/crear-empresa";
import { CasoUsoEliminarEmpresa } from "../../domain/usecases/eliminar-empresa";
import { CasoUsoListarEmpresas } from "../../domain/usecases/listar-empresas";
import { CasoUsoGestionarMarcaEmpresa } from "../../domain/usecases/gestionar-marca-empresa";
import { CasoUsoRenovarSuscripcion } from "../../domain/usecases/renovar-suscripcion";
import { CasoUsoListarRenovaciones } from "../../domain/usecases/listar-renovaciones";
import { DtoBuscarEmpresas } from "../dto/buscar-empresas.dto";
import { DtoCambiarEstadoEmpresa } from "../dto/cambiar-estado-empresa.dto";
import { DtoCrearEmpresa } from "../dto/crear-empresa.dto";
import { DtoRenovarSuscripcion } from "../dto/renovar-suscripcion.dto";

const LIMITE_MUTACIONES = 20;

/** Aprovisionamiento global de tenants. No expone configuración interna. */
@Controller("companies")
export class ControladorEmpresas {
  constructor(
    private listarEmpresas: CasoUsoListarEmpresas,
    private crearEmpresa: CasoUsoCrearEmpresa,
    private actualizarEmpresa: CasoUsoActualizarEmpresa,
    private cambiarEstadoEmpresa: CasoUsoCambiarEstadoEmpresa,
    private eliminarEmpresa: CasoUsoEliminarEmpresa,
    private marcaEmpresa: CasoUsoGestionarMarcaEmpresa,
    private renovarSuscripcion: CasoUsoRenovarSuscripcion,
    private listarRenovaciones: CasoUsoListarRenovaciones,
  ) {}

  @Get()
  @Permisos("superadmin.companies.read", "companies.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() query: DtoBuscarEmpresas,
  ) {
    return this.listarEmpresas.ejecutar(usuario.fid_organizaciones, query.q);
  }

  @Get("renewals")
  @Permisos("superadmin.companies.read", "superadmin.subscriptions.read", "companies.read", "administrator.company.subscription.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async renewals(
    @Req() peticion: Request,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Query("company_id") company_id?: string,
  ) {
    const lim = limit ? Number(limit) : 20;
    const esSuperAdmin = usuario.roles.includes("SUPERADMIN");
    const idOrganizacionFiltrar = esSuperAdmin ? (company_id || undefined) : usuario.fid_organizaciones;

    const data = await this.listarRenovaciones.ejecutar(
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
      q,
      lim,
      idOrganizacionFiltrar,
    );
    return data;
  }

  /** Sirve únicamente el escudo versionado solicitado por el listado global. */
  @Get(":id/media/:type/:version")
  @Permisos("superadmin.companies.read", "companies.read")
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async escudo(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("type") tipo: string,
    @Param("version") version: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    if (
      !["escudo", "escudo_oscuro"].includes(tipo) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|webp)$/i.test(
        version,
      )
    ) {
      throw new BadRequestException("companies.media.invalidRequest");
    }
    const medio = await this.marcaEmpresa.leer(
      id,
      {
        tipo: tipo as "escudo" | "escudo_oscuro",
        version,
      },
      usuario.fid_organizaciones,
    );
    respuesta.setHeader("content-type", medio.tipo_mime);
    respuesta.setHeader(
      "cache-control",
      "private, max-age=31536000, immutable",
    );
    respuesta.setHeader("etag", `"${version}"`);
    respuesta.setHeader("x-content-type-options", "nosniff");
    respuesta.setHeader("cross-origin-resource-policy", "same-origin");
    return new StreamableFile(medio.contenido);
  }

  @Patch(":id")
  @Permisos("superadmin.companies.update", "companies.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async actualizar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoCrearEmpresa,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    const tz = usuario.contexto?.preferencias?.zona_horaria ?? "America/Lima";
    await this.actualizarEmpresa.ejecutar(
      id,
      dto,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
      tz,
    );
    return { ok: true };
  }

  @Post()
  @Permisos("superadmin.companies.create", "companies.create")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(201)
  async crear(
    @Body() dto: DtoCrearEmpresa,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    const tz = usuario.contexto?.preferencias?.zona_horaria ?? "America/Lima";
    await this.crearEmpresa.ejecutar(
      dto,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
      tz,
    );
    return { ok: true };
  }

  @Patch(":id/status")
  @Permisos("superadmin.companies.update", "companies.update", "superadmin.companies.status")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async cambiarEstado(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoCambiarEstadoEmpresa,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.cambiarEstadoEmpresa.ejecutar(
      id,
      dto.activo,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("superadmin.companies.delete", "companies.delete")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async eliminar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.eliminarEmpresa.ejecutar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Post(":id/renew")
  @Permisos("superadmin.companies.update", "companies.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async renovar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoRenovarSuscripcion,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    const tz = usuario.contexto?.preferencias?.zona_horaria ?? "America/Lima";
    await this.renovarSuscripcion.ejecutar(
      id,
      {
        fid_planes: dto.fid_planes,
        fecha_inicio: parseDateInTimezone(dto.fecha_inicio, tz) || new Date(),
        fecha_fin: parseDateInTimezone(dto.fecha_fin, tz) || new Date(),
        monto: dto.monto,
        metodo_pago: dto.metodo_pago,
      },
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }
}
