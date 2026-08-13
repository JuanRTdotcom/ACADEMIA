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
import { CasoUsoGestionarServiciosVeterinaria } from "../../domain/usecases/gestionar-servicios-veterinaria";
import { DtoCambiarEstadoServicioVeterinaria } from "../dto/cambiar-estado-servicio-veterinaria.dto";
import { DtoGuardarServicioVeterinaria } from "../dto/guardar-servicio-veterinaria.dto";
import {
  DtoBuscarServiciosVeterinaria,
  DtoListarServiciosVeterinaria,
} from "../dto/listar-servicios-veterinaria.dto";

const LIMITE_MUTACIONES = 20;
const AMBITO_PAGINACION = "services.pagination";

interface PosicionServicios {
  id: string;
  direccion: "anterior" | "siguiente";
  organizacion: string;
  consulta: string | null;
}

@Controller("company/services")
export class ControladorServiciosVeterinaria {
  constructor(
    private servicios: CasoUsoGestionarServiciosVeterinaria,
    private tokens: ServicioTokenOpaco,
  ) {}

  @Get()
  @Permisos("administrator.services.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async listar(
    @Query() consulta: DtoListarServiciosVeterinaria,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    const posicion = consulta.p
      ? this.tokens.descifrar<PosicionServicios>(AMBITO_PAGINACION, consulta.p)
      : null;
    if (
      consulta.p &&
      (!posicion ||
        posicion.organizacion !== usuario.fid_organizaciones ||
        posicion.consulta !== (consulta.q ?? null) ||
        !isUUID(posicion.id, "4") ||
        !["anterior", "siguiente"].includes(posicion.direccion))
    ) {
      throw new BadRequestException("services.invalidCursor");
    }
    const catalogo = await this.servicios.listar(usuario.fid_organizaciones, {
      despues_de: posicion?.direccion === "siguiente" ? posicion.id : undefined,
      antes_de: posicion?.direccion === "anterior" ? posicion.id : undefined,
      consulta: consulta.q,
    });
    const token = (
      id: string | null,
      direccion: PosicionServicios["direccion"],
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
  @Permisos("administrator.services.read")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async buscar(
    @Query() consulta: DtoBuscarServiciosVeterinaria,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return {
      servicios: await this.servicios.buscar(
        usuario.fid_organizaciones,
        consulta.q,
      ),
    };
  }

  @Get(":id")
  @Permisos("administrator.services.read", "administrator.services.update")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  obtener(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.servicios.obtener(id, usuario.fid_organizaciones);
  }

  @Post()
  @Permisos("administrator.services.create")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(201)
  async crear(
    @Body() dto: DtoGuardarServicioVeterinaria,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.servicios.crear(
      usuario.fid_organizaciones,
      {
        nombre: dto.nombre,
        descripcion: dto.descripcion || null,
        precio: dto.precio || null,
      },
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Patch(":id")
  @Permisos("administrator.services.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async actualizar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoGuardarServicioVeterinaria,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.servicios.actualizar(
      id,
      usuario.fid_organizaciones,
      {
        nombre: dto.nombre,
        descripcion: dto.descripcion || null,
        precio: dto.precio || null,
      },
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Patch(":id/status")
  @Permisos("administrator.services.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async cambiarEstado(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoCambiarEstadoServicioVeterinaria,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.servicios.cambiarEstado(
      id,
      usuario.fid_organizaciones,
      dto.activo,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("administrator.services.delete")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async eliminar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.servicios.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { ok: true };
  }
}
