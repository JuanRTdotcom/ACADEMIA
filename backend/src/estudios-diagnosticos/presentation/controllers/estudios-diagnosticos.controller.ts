import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { Permisos } from "../../../autenticacion/presentation/decorators/permisos.decorador";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { DtoBuscarCatalogo, DtoListarCatalogoPaginado } from "../../../comun/presentation/dto/catalogo-paginado.dto";
import { leerPosicionCatalogo, protegerPaginacionCatalogo } from "../../../comun/seguridad/paginacion-catalogo";
import { ServicioTokenOpaco } from "../../../comun/seguridad/token-opaco.service";
import { CasoUsoGestionarEstudiosDiagnosticos } from "../../domain/usecases/gestionar-estudios-diagnosticos";
import { DtoCambiarEstadoEstudioDiagnostico, DtoGuardarEstudioDiagnostico } from "../dto/estudios-diagnosticos.dto";

@Controller("company/diagnostic-studies")
export class ControladorEstudiosDiagnosticos {
  constructor(private estudios: CasoUsoGestionarEstudiosDiagnosticos, private tokens: ServicioTokenOpaco) {}
  @Get() @Permisos("administrator.diagnostic_studies.read") @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async listar(@Query() query: DtoListarCatalogoPaginado, @UsuarioActual() usuario: UsuarioAutenticado) { const posicion = leerPosicionCatalogo(this.tokens, "diagnostic-studies.pagination", query.p, usuario.fid_organizaciones, query.q, "diagnosticStudies.invalidCursor"); const catalogo = await this.estudios.listar(usuario.fid_organizaciones, { despues_de: posicion?.direccion === "siguiente" ? posicion.id : undefined, antes_de: posicion?.direccion === "anterior" ? posicion.id : undefined, consulta: query.q }); return protegerPaginacionCatalogo(this.tokens, "diagnostic-studies.pagination", catalogo, usuario.fid_organizaciones, query.q); }
  @Get("search") @Permisos("administrator.diagnostic_studies.read") @Throttle({ default: { limit: 60, ttl: 60_000 } }) async buscar(@Query() query: DtoBuscarCatalogo, @UsuarioActual() usuario: UsuarioAutenticado) { return { estudios: await this.estudios.buscar(usuario.fid_organizaciones, query.q) }; }
  @Post() @Permisos("administrator.diagnostic_studies.create") @HttpCode(201) @Throttle({ default: { limit: 20, ttl: 60_000 } })
  crear(@Body() dto: DtoGuardarEstudioDiagnostico, @UsuarioActual() usuario: UsuarioAutenticado, @Req() req: Request) { return this.estudios.crear(usuario.fid_organizaciones, dto, usuario.sub, crearContextoSolicitud(req)); }
  @Patch(":id") @Permisos("administrator.diagnostic_studies.update") @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async actualizar(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Body() dto: DtoGuardarEstudioDiagnostico, @UsuarioActual() usuario: UsuarioAutenticado, @Req() req: Request) { await this.estudios.actualizar(id, usuario.fid_organizaciones, dto, usuario.sub, crearContextoSolicitud(req)); return { ok: true }; }
  @Patch(":id/status") @Permisos("administrator.diagnostic_studies.update") @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async estado(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Body() dto: DtoCambiarEstadoEstudioDiagnostico, @UsuarioActual() usuario: UsuarioAutenticado, @Req() req: Request) { await this.estudios.cambiarEstado(id, usuario.fid_organizaciones, dto.activo, usuario.sub, crearContextoSolicitud(req)); return { ok: true }; }
  @Delete(":id") @Permisos("administrator.diagnostic_studies.delete") @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async eliminar(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @UsuarioActual() usuario: UsuarioAutenticado, @Req() req: Request) { await this.estudios.eliminar(id, usuario.fid_organizaciones, usuario.sub, crearContextoSolicitud(req)); return { ok: true }; }
}
