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
import { DtoBuscarCatalogo, DtoListarCatalogoPaginado } from "../../../comun/presentation/dto/catalogo-paginado.dto";
import { leerPosicionCatalogo, protegerPaginacionCatalogo } from "../../../comun/seguridad/paginacion-catalogo";
import { ServicioTokenOpaco } from "../../../comun/seguridad/token-opaco.service";
import { CasoUsoGestionarTiposHospitalizacion } from "../../domain/usecases/gestionar-tipos-hospitalizacion";
import {
  DtoCambiarEstadoTipoHospitalizacion,
  DtoGuardarTipoHospitalizacion,
} from "../dto/tipos-hospitalizacion.dto";

@Controller("company/hospitalization-types")
export class ControladorTiposHospitalizacion {
  constructor(private tipos: CasoUsoGestionarTiposHospitalizacion, private tokens: ServicioTokenOpaco) {}

  @Get()
  @Permisos("administrator.hospitalization_types.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async listar(@Query() query: DtoListarCatalogoPaginado, @UsuarioActual() usuario: UsuarioAutenticado) {
    const posicion = leerPosicionCatalogo(this.tokens, "hospitalization-types.pagination", query.p, usuario.fid_organizaciones, query.q, "hospitalizationTypes.invalidCursor");
    const catalogo = await this.tipos.listar(usuario.fid_organizaciones, { despues_de: posicion?.direccion === "siguiente" ? posicion.id : undefined, antes_de: posicion?.direccion === "anterior" ? posicion.id : undefined, consulta: query.q });
    return protegerPaginacionCatalogo(this.tokens, "hospitalization-types.pagination", catalogo, usuario.fid_organizaciones, query.q);
  }

  @Get("search") @Permisos("administrator.hospitalization_types.read") @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async buscar(@Query() query: DtoBuscarCatalogo, @UsuarioActual() usuario: UsuarioAutenticado) { return { tipos: await this.tipos.buscar(usuario.fid_organizaciones, query.q) }; }

  @Post()
  @Permisos("administrator.hospitalization_types.create")
  @HttpCode(201)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  crear(
    @Body() dto: DtoGuardarTipoHospitalizacion,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    return this.tipos.crear(
      usuario.fid_organizaciones,
      { nombre: dto.nombre },
      usuario.sub,
      crearContextoSolicitud(req),
    );
  }

  @Patch(":id")
  @Permisos("administrator.hospitalization_types.update")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async actualizar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoGuardarTipoHospitalizacion,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.tipos.actualizar(
      id,
      usuario.fid_organizaciones,
      { nombre: dto.nombre },
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Patch(":id/status")
  @Permisos("administrator.hospitalization_types.update")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async estado(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoCambiarEstadoTipoHospitalizacion,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.tipos.cambiarEstado(
      id,
      usuario.fid_organizaciones,
      dto.activo,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("administrator.hospitalization_types.delete")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async eliminar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.tipos.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }
}
