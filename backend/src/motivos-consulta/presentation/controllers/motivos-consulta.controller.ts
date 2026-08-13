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
import { CasoUsoGestionarMotivosConsulta } from "../../domain/usecases/gestionar-motivos-consulta";
import {
  DtoBuscarMotivosConsulta,
  DtoCambiarEstadoMotivoConsulta,
  DtoGuardarMotivoConsulta,
  DtoListarMotivosConsulta,
} from "../dto/motivos-consulta.dto";

const AMBITO_PAGINACION = "consultation-reasons.pagination";

interface PosicionMotivosConsulta {
  id: string;
  direccion: "anterior" | "siguiente";
  organizacion: string;
  consulta: string | null;
}

@Controller("company/consultation-reasons")
export class ControladorMotivosConsulta {
  constructor(
    private motivos: CasoUsoGestionarMotivosConsulta,
    private tokens: ServicioTokenOpaco,
  ) {}
  @Get()
  @Permisos("administrator.consultation_reasons.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async listar(
    @Query() consulta: DtoListarMotivosConsulta,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    const posicion = consulta.p
      ? this.tokens.descifrar<PosicionMotivosConsulta>(
          AMBITO_PAGINACION,
          consulta.p,
        )
      : null;
    if (
      consulta.p &&
      (!posicion ||
        posicion.organizacion !== usuario.fid_organizaciones ||
        posicion.consulta !== (consulta.q ?? null) ||
        !isUUID(posicion.id, "4") ||
        !["anterior", "siguiente"].includes(posicion.direccion))
    ) {
      throw new BadRequestException("consultationReasons.invalidCursor");
    }
    const catalogo = await this.motivos.listar(usuario.fid_organizaciones, {
      despues_de: posicion?.direccion === "siguiente" ? posicion.id : undefined,
      antes_de: posicion?.direccion === "anterior" ? posicion.id : undefined,
      consulta: consulta.q,
    });
    const token = (
      id: string | null,
      direccion: PosicionMotivosConsulta["direccion"],
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
  @Permisos("administrator.consultation_reasons.read")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async buscar(
    @Query() consulta: DtoBuscarMotivosConsulta,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return {
      motivos: await this.motivos.buscar(
        usuario.fid_organizaciones,
        consulta.q,
      ),
    };
  }
  @Post()
  @Permisos("administrator.consultation_reasons.create")
  @HttpCode(201)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async crear(
    @Body() dto: DtoGuardarMotivoConsulta,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    return this.motivos.crear(
      usuario.fid_organizaciones,
      { nombre: dto.nombre, descripcion: dto.descripcion || null },
      usuario.sub,
      crearContextoSolicitud(req),
    );
  }
  @Patch(":id")
  @Permisos("administrator.consultation_reasons.update")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async actualizar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoGuardarMotivoConsulta,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.motivos.actualizar(
      id,
      usuario.fid_organizaciones,
      { nombre: dto.nombre, descripcion: dto.descripcion || null },
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }
  @Patch(":id/status")
  @Permisos("administrator.consultation_reasons.update")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async estado(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoCambiarEstadoMotivoConsulta,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.motivos.cambiarEstado(
      id,
      usuario.fid_organizaciones,
      dto.activo,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }
  @Delete(":id")
  @Permisos("administrator.consultation_reasons.delete")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async eliminar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.motivos.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }
}
