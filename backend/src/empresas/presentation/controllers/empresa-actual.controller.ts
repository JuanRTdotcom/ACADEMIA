import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import { Permisos } from "../../../autenticacion/presentation/decorators/permisos.decorador";
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
  DtoGuardarGeneralEmpresa,
  DtoGuardarComunicacionesEmpresa,
  DtoGuardarContactoEmpresa,
  DtoGuardarDigitalEmpresa,
  DtoGuardarIdentidadEmpresa,
  DtoGuardarLoginEmpresa,
  DtoGuardarRegionEmpresa,
  DtoGuardarServiciosVeterinaria,
  DtoGuardarAgendaVeterinaria,
  DtoGuardarFiscalVeterinaria,
} from "../dto/guardar-seccion-empresa.dto";
import { InterceptorErroresMediosEmpresa } from "../interceptors/interceptor-errores-medios-empresa";
import { DtoGuardarMedioEmpresa } from "../dto/guardar-medio-empresa.dto";
import { DtoCompartirMedioEmpresa } from "../dto/compartir-medio-empresa.dto";
import { DtoGuardarSede, DtoSeleccionarSede } from "../dto/guardar-sede.dto";

const LIMITE_MUTACIONES = 20;
const SECCIONES: Readonly<Record<string, SeccionEmpresa>> = {
  general: "general",
  contact: "contacto",
  "digital-presence": "digital",
  identity: "identidad",
  communications: "comunicaciones",
  region: "region",
  services: "servicios",
  agenda: "agenda",
  fiscal: "fiscal",
  "login-branding": "login",
};
const PERMISOS_LECTURA_SECCION: Readonly<Record<SeccionEmpresa, string>> = {
  general: "administrator.company.general.read",
  contacto: "administrator.company.contact.read",
  digital: "administrator.company.digital_presence.read",
  identidad: "administrator.company.identity.read",
  comunicaciones: "administrator.company.communications.read",
  region: "administrator.company.region.read",
  servicios: "administrator.company.services.read",
  agenda: "administrator.company.agenda.read",
  fiscal: "administrator.company.fiscal.read",
  login: "administrator.company.login_branding.read",
};

/** Configuración del tenant obtenido exclusivamente desde la sesión. */
@Controller("company/current")
export class ControladorEmpresaActual {
  constructor(private empresa: CasoUsoGestionarEmpresaActual) {}

  private sedeActiva(usuario: UsuarioAutenticado) {
    const sede = usuario.contexto.sede_activa?.id_sedes;
    if (!sede) throw new BadRequestException("companies.branches.unavailable");
    return sede;
  }

  @Get("branches")
  @Permisos("administrator.company.branches.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  sedes(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.empresa.sedes(usuario.fid_organizaciones, usuario.idioma);
  }

  @Post("branches")
  @Permisos("administrator.company.branches.create")
  @HttpCode(201)
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  crearSede(
    @Body() dto: DtoGuardarSede,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    return this.empresa.crearSede(
      usuario.fid_organizaciones,
      dto,
      this.sedeActiva(usuario),
      usuario.sub,
      crearContextoSolicitud(req),
    );
  }

  @Patch("branches/:id")
  @Permisos("administrator.company.branches.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarSede(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoGuardarSede,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    return this.empresa.actualizarSede(
      id,
      usuario.fid_organizaciones,
      dto,
      this.sedeActiva(usuario),
      usuario.sub,
      crearContextoSolicitud(req),
    );
  }

  @Delete("branches/:id")
  @Permisos("administrator.company.branches.delete")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  async eliminarSede(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.empresa.eliminarSede(
      id,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Patch("active-branch")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  async seleccionarSede(
    @Body() dto: DtoSeleccionarSede,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.empresa.seleccionarSede(
      dto.fid_sedes,
      usuario.fid_organizaciones,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  private exigirPermiso(usuario: UsuarioAutenticado, permiso: string) {
    if (!usuario.permisos.includes(permiso)) {
      throw new ForbiddenException("auth.noPermission");
    }
  }

  private exigirSedePrincipal(usuario: UsuarioAutenticado) {
    if (!usuario.contexto.sede_activa?.es_principal)
      throw new ForbiddenException(
        "companies.branches.mainOnlyConfiguration",
      );
  }

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
  @Permisos(
    "administrator.company.general.read",
    "administrator.company.contact.read",
    "administrator.company.region.read",
    "administrator.company.services.read",
    "administrator.company.agenda.read",
    "administrator.company.fiscal.read",
    "administrator.company.digital_presence.read",
    "administrator.company.identity.read",
    "administrator.company.login_branding.read",
    "administrator.company.communications.read",
    "administrator.company.region.read",
    "administrator.company.subscription.read",
    "administrator.company.branches.read",
  )
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  resumen(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.empresa.resumen(
      usuario.fid_organizaciones,
      usuario.contexto.sede_activa?.id_sedes ?? null,
    );
  }

  @Get("sections/:section")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  seccion(
    @Param("section") section: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    const seccion = SECCIONES[section];
    if (!seccion) throw new BadRequestException("companies.invalidSection");
    this.exigirPermiso(usuario, PERMISOS_LECTURA_SECCION[seccion]);
    if (seccion === "identidad" || seccion === "login")
      this.exigirSedePrincipal(usuario);
    return this.empresa.seccion(
      usuario.fid_organizaciones,
      seccion,
      usuario.contexto.sede_activa?.id_sedes ?? null,
    );
  }

  @Get("branding")
  @Permisos(
    "administrator.company.identity.read",
    "administrator.company.login_branding.read",
  )
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async marca(@UsuarioActual() usuario: UsuarioAutenticado) {
    this.exigirSedePrincipal(usuario);
    const marca = await this.empresa.marca(
      usuario.fid_organizaciones,
      this.sedeActiva(usuario),
    );
    if (!usuario.permisos.includes("administrator.company.identity.read")) {
      marca.escudo_version = null;
      marca.escudo_oscuro_version = null;
      marca.imagotipo_version = null;
      marca.imagotipo_oscuro_version = null;
      marca.portadas = [];
    }
    if (
      !usuario.permisos.includes("administrator.company.login_branding.read")
    ) {
      marca.login_escudo_version = null;
      marca.login_escudo_oscuro_version = null;
    }
    return marca;
  }

  @Get("location-catalogs")
  @Permisos(
    "administrator.company.contact.read",
    "administrator.company.services.read",
    "administrator.company.fiscal.read",
    "administrator.company.branches.read",
  )
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
    const medio = await this.empresa.leerMedio(
      usuario.fid_organizaciones,
      this.sedeActiva(usuario),
      {
        tipo: medioTipo,
        version,
        id_portada: portada,
      },
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

  @Patch("media/:type/reuse")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  compartirMedio(
    @Param("type") tipo: string,
    @Body() dto: DtoCompartirMedioEmpresa,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    this.exigirPermiso(
      usuario,
      tipo === "login_escudo"
        ? "administrator.company.login_branding.update"
        : "administrator.company.identity.update",
    );
    return this.empresa.compartirMedio(
      usuario.fid_organizaciones,
      this.sedeActiva(usuario),
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
    this.exigirPermiso(
      usuario,
      tipo.startsWith("login_")
        ? "administrator.company.login_branding.update"
        : "administrator.company.identity.update",
    );
    return this.empresa.guardarMedio(
      usuario.fid_organizaciones,
      this.sedeActiva(usuario),
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
    this.exigirPermiso(
      usuario,
      tipo.startsWith("login_")
        ? "administrator.company.login_branding.update"
        : "administrator.company.identity.update",
    );
    return this.empresa.eliminarMedio(
      usuario.fid_organizaciones,
      this.sedeActiva(usuario),
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
      usuario.contexto.sede_activa?.id_sedes ?? null,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("sections/general")
  @Permisos("administrator.company.general.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarGeneral(
    @Body() dto: DtoGuardarGeneralEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "general", dto, r);
  }

  @Patch("sections/contact")
  @Permisos("administrator.company.contact.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarContacto(
    @Body() dto: DtoGuardarContactoEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "contacto", dto, r);
  }

  @Patch("sections/digital-presence")
  @Permisos("administrator.company.digital_presence.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarDigital(
    @Body() dto: DtoGuardarDigitalEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "digital", dto, r);
  }

  @Patch("sections/identity")
  @Permisos("administrator.company.identity.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarIdentidad(
    @Body() dto: DtoGuardarIdentidadEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "identidad", dto, r);
  }

  @Patch("sections/communications")
  @Permisos("administrator.company.communications.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarComunicaciones(
    @Body() dto: DtoGuardarComunicacionesEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "comunicaciones", dto, r);
  }

  @Patch("sections/region")
  @Permisos("administrator.company.region.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarRegion(
    @Body() dto: DtoGuardarRegionEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "region", dto, r);
  }

  @Patch("sections/services")
  @Permisos("administrator.company.services.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarServicios(
    @Body() dto: DtoGuardarServiciosVeterinaria,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "servicios", dto, r);
  }

  @Patch("sections/agenda")
  @Permisos("administrator.company.agenda.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarAgenda(
    @Body() dto: DtoGuardarAgendaVeterinaria,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "agenda", dto, r);
  }

  @Patch("sections/fiscal")
  @Permisos("administrator.company.fiscal.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarFiscal(
    @Body() dto: DtoGuardarFiscalVeterinaria,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "fiscal", dto, r);
  }

  @Patch("sections/login-branding")
  @Permisos("administrator.company.login_branding.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  actualizarLogin(
    @Body() dto: DtoGuardarLoginEmpresa,
    @UsuarioActual() u: UsuarioAutenticado,
    @Req() r: Request,
  ) {
    return this.actualizar(u, "login", dto, r);
  }

  @Patch("login/color-filter")
  @Permisos("administrator.company.login_branding.update")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async actualizarFiltroColorLogin(
    @Body() dto: DtoActualizarFiltroColorLoginEmpresa,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    await this.empresa.actualizarFiltroColorLogin(
      usuario.fid_organizaciones,
      this.sedeActiva(usuario),
      dto.login_usar_filtro_color,
      usuario.sub,
      crearContextoSolicitud(peticion),
    );
    return { login_usar_filtro_color: dto.login_usar_filtro_color };
  }
}
