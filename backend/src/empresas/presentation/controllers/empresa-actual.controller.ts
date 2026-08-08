import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import type {
  SeccionEmpresa,
  SeccionesEmpresa,
} from "../../domain/entities/seccion-empresa";
import type {
  TipoMarcaEmpresa,
  TipoMedioEmpresa,
} from "../../domain/entities/medio-empresa";
import { CasoUsoGestionarEmpresaActual } from "../../domain/usecases/gestionar-empresa-actual";
import {
  DtoActualizarFiltroColorLoginEmpresa,
  DtoGuardarComunicacionesEmpresa,
  DtoGuardarContactoEmpresa,
  DtoGuardarDigitalEmpresa,
  DtoGuardarIdentidadEmpresa,
  DtoGuardarLoginEmpresa,
  DtoGuardarRegionEmpresa,
} from "../dto/guardar-seccion-empresa.dto";
import { InterceptorErroresMediosEmpresa } from "../interceptors/interceptor-errores-medios-empresa";
import { DtoGuardarMedioEmpresa } from "../dto/guardar-medio-empresa.dto";
import { DtoCompartirMedioEmpresa } from "../dto/compartir-medio-empresa.dto";

const LIMITE_MUTACIONES = 20;
const SECCIONES: Readonly<Record<string, SeccionEmpresa>> = {
  general: "general",
  contact: "contacto",
  "digital-presence": "digital",
  identity: "identidad",
  communications: "comunicaciones",
  region: "region",
  "login-branding": "login",
};

/** Configuración del tenant obtenido exclusivamente desde la sesión. */
@Controller("company/current")
export class ControladorEmpresaActual {
  constructor(private empresa: CasoUsoGestionarEmpresaActual) {}

  private tipoMedio(tipo: string): TipoMedioEmpresa {
    if (
      ![
        "escudo",
        "escudo_oscuro",
        "imagotipo",
        "imagotipo_oscuro",
        "portada",
        "login_escudo",
        "login_escudo_oscuro",
      ].includes(tipo)
    ) {
      throw new BadRequestException("companies.media.invalidRequest");
    }
    return tipo as TipoMedioEmpresa;
  }

  private tipoMarca(tipo: string): TipoMarcaEmpresa {
    if (!["escudo", "imagotipo", "login_escudo"].includes(tipo)) {
      throw new BadRequestException("companies.media.invalidRequest");
    }
    return tipo as TipoMarcaEmpresa;
  }

  @Get("summary")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  resumen(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.empresa.resumen(usuario.fid_organizaciones);
  }

  @Get("sections/:section")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  seccion(
    @Param("section") section: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    const seccion = SECCIONES[section];
    if (!seccion) throw new BadRequestException("companies.invalidSection");
    return this.empresa.seccion(usuario.fid_organizaciones, seccion);
  }

  @Get("branding")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  marca(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.empresa.marca(usuario.fid_organizaciones);
  }

  @Get("location-catalogs")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  catalogosUbicacion(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.empresa.catalogosUbicacion(usuario.fid_organizaciones);
  }

  @Get("media/:type/:version")
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async medio(
    @Param("type") tipo: string,
    @Param("version") version: string,
    @Query("coverId") portada: string | undefined,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const medioTipo = this.tipoMedio(tipo);
    const uuid =
      "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
    const extensiones = medioTipo === "portada" ? "webp" : "(?:png|jpg|webp)";
    if (!new RegExp(`^${uuid}\\.${extensiones}$`, "i").test(version)) {
      throw new BadRequestException("companies.media.invalidRequest");
    }
    const medio = await this.empresa.leerMedio(usuario.fid_organizaciones, {
      tipo: medioTipo,
      version,
      id_portada: portada,
    });
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

  @Patch("media/:type/reuse")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  compartirMedio(
    @Param("type") tipo: string,
    @Body() dto: DtoCompartirMedioEmpresa,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    return this.empresa.compartirMedio(
      usuario.fid_organizaciones,
      {
        tipo: this.tipoMarca(tipo),
        usar_misma_imagen: dto.usar_misma_imagen,
      },
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
  }

  @Post("media/:type")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  @UseInterceptors(InterceptorErroresMediosEmpresa, FileInterceptor("image"))
  guardarMedio(
    @Param("type") tipo: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body() dto: DtoGuardarMedioEmpresa,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    if (!archivo) {
      throw new BadRequestException("companies.media.invalidRequest");
    }
    return this.empresa.guardarMedio(
      usuario.fid_organizaciones,
      {
        tipo: this.tipoMedio(tipo),
        archivo: {
          contenido: archivo.buffer,
          tipo_mime: archivo.mimetype,
          nombre_original: archivo.originalname,
        },
        texto_alternativo: dto.texto_alternativo,
      },
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
  }

  @Delete("media/:type")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  eliminarMedio(
    @Param("type") tipo: string,
    @Query("coverId") portada: string | undefined,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    if (
      portada &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        portada,
      )
    ) {
      throw new BadRequestException("companies.media.invalidRequest");
    }
    return this.empresa.eliminarMedio(
      usuario.fid_organizaciones,
      { tipo: this.tipoMedio(tipo), id_portada: portada },
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
  }

  private actualizar<S extends SeccionEmpresa>(
    usuario: UsuarioAutenticado,
    seccion: S,
    datos: SeccionesEmpresa[S],
    peticion: Request,
  ) {
    return this.empresa.actualizar(
      usuario.fid_organizaciones,
      seccion,
      datos,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("sections/contact")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarContacto(
    @Body() dto: DtoGuardarContactoEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "contacto", dto, r);
  }

  @Patch("sections/digital-presence")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarDigital(
    @Body() dto: DtoGuardarDigitalEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "digital", dto, r);
  }

  @Patch("sections/identity")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarIdentidad(
    @Body() dto: DtoGuardarIdentidadEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "identidad", dto, r);
  }

  @Patch("sections/communications")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarComunicaciones(
    @Body() dto: DtoGuardarComunicacionesEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "comunicaciones", dto, r);
  }

  @Patch("sections/region")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarRegion(
    @Body() dto: DtoGuardarRegionEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "region", dto, r);
  }

  @Patch("sections/login-branding")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarLogin(
    @Body() dto: DtoGuardarLoginEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "login", dto, r);
  }

  @Patch("login/color-filter")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async actualizarFiltroColorLogin(
    @Body() dto: DtoActualizarFiltroColorLoginEmpresa,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.empresa.actualizarFiltroColorLogin(
      usuario.fid_organizaciones,
      dto.login_usar_filtro_color,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { login_usar_filtro_color: dto.login_usar_filtro_color };
  }
}
