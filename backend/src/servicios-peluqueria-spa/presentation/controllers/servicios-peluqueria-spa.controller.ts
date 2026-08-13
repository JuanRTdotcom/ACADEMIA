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
import { CasoUsoGestionarServiciosPeluqueriaSpa } from "../../domain/usecases/gestionar-servicios-peluqueria-spa";
import { DtoCambiarEstadoServicioPeluqueriaSpa, DtoGuardarServicioPeluqueriaSpa } from "../dto/servicios-peluqueria-spa.dto";
@Controller("company/grooming-services")
export class ControladorServiciosPeluqueriaSpa {
  constructor(private servicios: CasoUsoGestionarServiciosPeluqueriaSpa, private tokens: ServicioTokenOpaco) {}
  @Get() @Permisos("administrator.grooming_services.read") @Throttle({ default: { limit: 30, ttl: 60_000 } }) async listar(@Query() query: DtoListarCatalogoPaginado, @UsuarioActual() usuario: UsuarioAutenticado) { const posicion = leerPosicionCatalogo(this.tokens, "grooming-services.pagination", query.p, usuario.fid_organizaciones, query.q, "groomingServices.invalidCursor"); const catalogo = await this.servicios.listar(usuario.fid_organizaciones, { despues_de: posicion?.direccion === "siguiente" ? posicion.id : undefined, antes_de: posicion?.direccion === "anterior" ? posicion.id : undefined, consulta: query.q }); return protegerPaginacionCatalogo(this.tokens, "grooming-services.pagination", catalogo, usuario.fid_organizaciones, query.q); }
  @Get("search") @Permisos("administrator.grooming_services.read") @Throttle({ default: { limit: 60, ttl: 60_000 } }) async buscar(@Query() query: DtoBuscarCatalogo, @UsuarioActual() usuario: UsuarioAutenticado) { return { servicios: await this.servicios.buscar(usuario.fid_organizaciones, query.q) }; }
  @Post() @Permisos("administrator.grooming_services.create") @HttpCode(201) @Throttle({ default: { limit: 20, ttl: 60_000 } }) crear(@Body() dto: DtoGuardarServicioPeluqueriaSpa, @UsuarioActual() usuario: UsuarioAutenticado, @Req() req: Request) { return this.servicios.crear(usuario.fid_organizaciones, dto, usuario.sub, crearContextoSolicitud(req)); }
  @Patch(":id") @Permisos("administrator.grooming_services.update") @Throttle({ default: { limit: 20, ttl: 60_000 } }) async actualizar(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Body() dto: DtoGuardarServicioPeluqueriaSpa, @UsuarioActual() usuario: UsuarioAutenticado, @Req() req: Request) { await this.servicios.actualizar(id, usuario.fid_organizaciones, dto, usuario.sub, crearContextoSolicitud(req)); return { ok: true }; }
  @Patch(":id/status") @Permisos("administrator.grooming_services.update") @Throttle({ default: { limit: 20, ttl: 60_000 } }) async estado(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @Body() dto: DtoCambiarEstadoServicioPeluqueriaSpa, @UsuarioActual() usuario: UsuarioAutenticado, @Req() req: Request) { await this.servicios.cambiarEstado(id, usuario.fid_organizaciones, dto.activo, usuario.sub, crearContextoSolicitud(req)); return { ok: true }; }
  @Delete(":id") @Permisos("administrator.grooming_services.delete") @Throttle({ default: { limit: 20, ttl: 60_000 } }) async eliminar(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string, @UsuarioActual() usuario: UsuarioAutenticado, @Req() req: Request) { await this.servicios.eliminar(id, usuario.fid_organizaciones, usuario.sub, crearContextoSolicitud(req)); return { ok: true }; }
}
