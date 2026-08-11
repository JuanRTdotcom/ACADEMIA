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
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { Permisos } from "../../../autenticacion/presentation/decorators/permisos.decorador";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { CasoUsoGestionarAtenciones } from "../../domain/usecases/gestionar-atenciones";
import {
  DtoBuscarPropietariosAtencion,
  DtoCambiarEstadoAtencion,
  DtoCrearAtencion,
  DtoListarAtenciones,
  DtoRegistroAtencion,
} from "../dto/atenciones.dto";
import { InterceptorErroresAdjuntosAtencion } from "../interceptors/interceptor-errores-adjuntos-atencion";

@Controller("clinic/attentions")
export class ControladorAtenciones {
  constructor(
    private atenciones: CasoUsoGestionarAtenciones,
    private config: ConfigService,
  ) {}

  @Get()
  @Permisos("clinic.attentions.read")
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  listar(
    @Query() filtros: DtoListarAtenciones,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.atenciones.listarHoy(
      usuario.fid_organizaciones,
      filtros,
      usuario.idioma,
    );
  }

  @Get("options")
  @Permisos("clinic.attentions.create", "clinic.attentions.update")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  opciones(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.atenciones.opciones(usuario.fid_organizaciones, usuario.idioma);
  }

  @Get("owners")
  @Permisos("clinic.attentions.create")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  propietarios(
    @Query() filtros: DtoBuscarPropietariosAtencion,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.atenciones.buscarPropietarios(
      usuario.fid_organizaciones,
      filtros.q,
    );
  }

  @Get("owners/:owner/pets")
  @Permisos("clinic.attentions.create")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  mascotas(
    @Param("owner", new ParseUUIDPipe({ version: "4" })) propietario: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.atenciones.mascotasPropietario(
      usuario.fid_organizaciones,
      propietario,
      usuario.idioma,
    );
  }

  @Get("pets/:pet/records/:type/latest")
  @Permisos("clinic.attentions.create", "clinic.attentions.update")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  ultimoRegistroMascota(
    @Param("pet", new ParseUUIDPipe({ version: "4" })) mascota: string,
    @Param("type", new ParseUUIDPipe({ version: "4" })) tipo: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.atenciones.ultimoRegistroMascota(
      usuario.fid_organizaciones,
      mascota,
      tipo,
    );
  }

  @Get(":id")
  @Permisos("clinic.attentions.read")
  obtener(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.atenciones.obtener(
      id,
      usuario.fid_organizaciones,
      usuario.idioma,
    );
  }

  @Post()
  @Permisos("clinic.attentions.create")
  @HttpCode(201)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    InterceptorErroresAdjuntosAtencion,
    FilesInterceptor("adjuntos"),
  )
  crear(
    @Body() dto: DtoCrearAtencion,
    @UploadedFiles() archivos: Express.Multer.File[] | undefined,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    return this.atenciones.crear(
      usuario.fid_organizaciones,
      { fid_mascotas: dto.fid_mascotas, registro: dto.registro },
      this.archivos(archivos),
      usuario.sub,
      crearContextoSolicitud(req),
    );
  }

  @Post(":id/records")
  @Permisos("clinic.attentions.update")
  @HttpCode(201)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(
    InterceptorErroresAdjuntosAtencion,
    FilesInterceptor("adjuntos"),
  )
  agregar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoRegistroAtencion,
    @UploadedFiles() archivos: Express.Multer.File[] | undefined,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    return this.atenciones.agregarRegistro(
      id,
      usuario.fid_organizaciones,
      dto,
      this.archivos(archivos),
      usuario.sub,
      crearContextoSolicitud(req),
    );
  }

  @Get(":id/records/:record/attachments/:attachment")
  @Permisos("clinic.attentions.read")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async adjunto(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("record", new ParseUUIDPipe({ version: "4" })) registro: string,
    @Param("attachment", new ParseUUIDPipe({ version: "4" })) adjunto: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Res({ passthrough: true }) response: Response,
  ) {
    const archivo = await this.atenciones.obtenerAdjunto(
      id,
      registro,
      adjunto,
      usuario.fid_organizaciones,
    );
    response.setHeader("content-type", archivo.tipoMime);
    response.setHeader(
      "cache-control",
      `private, max-age=${this.config.getOrThrow<number>("ATTENTION_ATTACHMENT_CACHE_TTL_SECONDS")}, immutable`,
    );
    response.setHeader("etag", `"${archivo.checksum}"`);
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader(
      "content-disposition",
      `${archivo.tipoMime.startsWith("image/") ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
    );
    response.setHeader("cross-origin-resource-policy", "same-origin");
    response.setHeader(
      "content-security-policy",
      "default-src 'none'; sandbox",
    );
    return new StreamableFile(archivo.contenido);
  }

  @Patch(":id/status")
  @Permisos("clinic.attentions.update")
  @HttpCode(200)
  async estado(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoCambiarEstadoAtencion,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.atenciones.cambiarEstado(
      id,
      usuario.fid_organizaciones,
      dto.fid_parametros_estado,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Delete(":id/records/:record")
  @Permisos("clinic.attentions.update")
  @HttpCode(200)
  async eliminarRegistro(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("record", new ParseUUIDPipe({ version: "4" })) registro: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.atenciones.eliminarRegistro(
      id,
      registro,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("clinic.attentions.delete")
  @HttpCode(200)
  async eliminar(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.atenciones.eliminar(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  private archivos(archivos: Express.Multer.File[] | undefined) {
    return (archivos ?? []).map((archivo) => ({
      contenido: archivo.buffer,
      tipo_mime: archivo.mimetype,
      nombre_original: archivo.originalname,
    }));
  }
}
