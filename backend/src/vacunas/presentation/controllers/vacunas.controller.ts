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
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { isUUID } from "class-validator";
import type { Request } from "express";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { Permisos } from "../../../autenticacion/presentation/decorators/permisos.decorador";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { ServicioTokenOpaco } from "../../../comun/seguridad/token-opaco.service";
import { CasoUsoGestionarVacunas } from "../../domain/usecases/gestionar-vacunas";
import {
  DtoBuscarVacunas,
  DtoCambiarEstadoVacuna,
  DtoGuardarVacuna,
  DtoListarVacunas,
} from "../dto/vacunas.dto";

const AMBITO_PAGINACION = "vaccines.pagination";
interface PosicionVacunas {
  id: string;
  direccion: "anterior" | "siguiente";
  organizacion: string;
  consulta: string | null;
}

@Controller("company/vaccines")
export class ControladorVacunas {
  constructor(
    private vacunas: CasoUsoGestionarVacunas,
    private tokens: ServicioTokenOpaco,
  ) {}

  @Get()
  @Permisos("administrator.vaccines.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async listar(
    @Query() consulta: DtoListarVacunas,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    const posicion = consulta.p
      ? this.tokens.descifrar<PosicionVacunas>(AMBITO_PAGINACION, consulta.p)
      : null;
    if (
      consulta.p &&
      (!posicion ||
        posicion.organizacion !== usuario.fid_organizaciones ||
        posicion.consulta !== (consulta.q ?? null) ||
        !isUUID(posicion.id, "4") ||
        !["anterior", "siguiente"].includes(posicion.direccion))
    )
      throw new BadRequestException("vaccines.invalidCursor");
    const catalogo = await this.vacunas.listar(usuario.fid_organizaciones, {
      despues_de: posicion?.direccion === "siguiente" ? posicion.id : undefined,
      antes_de: posicion?.direccion === "anterior" ? posicion.id : undefined,
      consulta: consulta.q,
    });
    const token = (
      id: string | null,
      direccion: PosicionVacunas["direccion"],
    ) =>
      id
        ? this.tokens.cifrar(AMBITO_PAGINACION, {
            id,
            direccion,
            organizacion: usuario.fid_organizaciones,
            consulta: consulta.q ?? null,
          })
        : null;
    return {
      ...catalogo,
      paginacion: {
        anterior: token(catalogo.paginacion.anterior, "anterior"),
        siguiente: token(catalogo.paginacion.siguiente, "siguiente"),
      },
    };
  }

  @Get("search")
  @Permisos("administrator.vaccines.read")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async buscar(
    @Query() consulta: DtoBuscarVacunas,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return {
      vacunas: await this.vacunas.buscar(
        usuario.fid_organizaciones,
        consulta.q,
      ),
    };
  }

  @Post()
  @Permisos("administrator.vaccines.create")
  @HttpCode(201)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  crear(
    @Body() dto: DtoGuardarVacuna,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    return this.vacunas.crear(
      usuario.fid_organizaciones,
      { nombre: dto.nombre },
      usuario.sub,
      crearContextoSolicitud(req),
    );
  }

  @Patch(":id")
  @Permisos("administrator.vaccines.update")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async actualizar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoGuardarVacuna,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.vacunas.actualizar(
      id,
      usuario.fid_organizaciones,
      { nombre: dto.nombre },
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Patch(":id/status")
  @Permisos("administrator.vaccines.update")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async estado(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoCambiarEstadoVacuna,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.vacunas.cambiarEstado(
      id,
      usuario.fid_organizaciones,
      dto.activo,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("administrator.vaccines.delete")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async eliminar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.vacunas.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }
}
