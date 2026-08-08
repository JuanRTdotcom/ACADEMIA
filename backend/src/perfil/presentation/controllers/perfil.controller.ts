import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Logger,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  UnauthorizedException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import type { Response } from "express";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { DtoActualizarApariencia } from "../dto/actualizar-apariencia.dto";
import { CasoUsoActualizarApariencia } from "../../domain/usecases/actualizar-apariencia";
import { CasoUsoListarActividad } from "../../domain/usecases/listar-actividad";
import { DtoListarActividad } from "../dto/listar-actividad.dto";
import { DtoActualizarDatosPersonales } from "../dto/actualizar-datos-personales.dto";
import { CasoUsoObtenerDatosPersonales } from "../../domain/usecases/obtener-datos-personales";
import { CasoUsoActualizarDatosPersonales } from "../../domain/usecases/actualizar-datos-personales";
import { CasoUsoObtenerAvatar } from "../../domain/usecases/obtener-avatar";
import { CasoUsoActualizarAvatar } from "../../domain/usecases/actualizar-avatar";
import { CasoUsoEliminarAvatar } from "../../domain/usecases/eliminar-avatar";
import { InterceptorErroresAvatar } from "../interceptors/interceptor-errores-avatar";
import { CasoUsoCambiarContrasenia } from "../../domain/usecases/cambiar-contrasenia";
import { DtoCambiarContrasenia } from "../dto/cambiar-contrasenia.dto";
import { CasoUsoRotarSesionActual } from "../../../autenticacion/domain/usecases/rotar-sesion-actual";
import {
  ServicioCookies,
  type TokensSesion,
} from "../../../comun/cookies/servicio-cookies";
import { CasoUsoCerrarSesion } from "../../../autenticacion/domain/usecases/cerrar-sesion";
import { CasoUsoAgregarCorreo } from "../../domain/usecases/agregar-correo";
import { CasoUsoSeleccionarCorreoUso } from "../../domain/usecases/seleccionar-correo-uso";
import { CasoUsoActualizarVerificacionCorreo } from "../../domain/usecases/actualizar-verificacion-correo";
import { CasoUsoModificarCorreo } from "../../domain/usecases/modificar-correo";
import { CasoUsoEliminarCorreo } from "../../domain/usecases/eliminar-correo";
import { DtoAgregarCorreo } from "../dto/agregar-correo.dto";
import { DtoModificarCorreo } from "../dto/modificar-correo.dto";
import { DtoSeleccionarCorreoUso } from "../dto/seleccionar-correo-uso.dto";
import { DtoActualizarVerificacionCorreo } from "../dto/actualizar-verificacion-correo.dto";
import { CasoUsoListarSesiones } from "../../domain/usecases/listar-sesiones";
import { CasoUsoCerrarOtraSesion } from "../../domain/usecases/cerrar-otra-sesion";
import { CasoUsoActualizarSegundoFactor } from "../../domain/usecases/actualizar-segundo-factor";
import { DtoActualizarSegundoFactor } from "../dto/actualizar-segundo-factor.dto";
import { CasoUsoListarNacionalidades } from "../../domain/usecases/listar-nacionalidades";
import { CasoUsoAgregarNacionalidad } from "../../domain/usecases/agregar-nacionalidad";
import { CasoUsoEliminarNacionalidad } from "../../domain/usecases/eliminar-nacionalidad";
import { DtoAgregarNacionalidad } from "../dto/agregar-nacionalidad.dto";
import { CasoUsoListarHobbies } from "../../domain/usecases/listar-hobbies";
import { CasoUsoAgregarHobby } from "../../domain/usecases/agregar-hobby";
import { CasoUsoEliminarHobby } from "../../domain/usecases/eliminar-hobby";
import { CasoUsoModificarHobby } from "../../domain/usecases/modificar-hobby";
import { DtoAgregarHobby } from "../dto/agregar-hobby.dto";
import { CasoUsoListarSeguros } from "../../domain/usecases/listar-seguros";
import { CasoUsoAgregarSeguro } from "../../domain/usecases/agregar-seguro";
import { CasoUsoModificarSeguro } from "../../domain/usecases/modificar-seguro";
import { CasoUsoEliminarSeguro } from "../../domain/usecases/eliminar-seguro";
import { DtoGuardarSeguro } from "../dto/guardar-seguro.dto";
import { CasoUsoListarDocumentos } from "../../domain/usecases/listar-documentos";
import { CasoUsoAgregarDocumento } from "../../domain/usecases/agregar-documento";
import { CasoUsoModificarDocumento } from "../../domain/usecases/modificar-documento";
import { CasoUsoEliminarDocumento } from "../../domain/usecases/eliminar-documento";
import { DtoGuardarDocumento } from "../dto/guardar-documento.dto";
import { CasoUsoListarTelefonos } from "../../domain/usecases/listar-telefonos";
import { CasoUsoAgregarTelefono } from "../../domain/usecases/agregar-telefono";
import { CasoUsoModificarTelefono } from "../../domain/usecases/modificar-telefono";
import { CasoUsoEliminarTelefono } from "../../domain/usecases/eliminar-telefono";
import { DtoGuardarTelefono } from "../dto/guardar-telefono.dto";
import { CasoUsoListarEstudios } from "../../domain/usecases/listar-estudios";
import { CasoUsoAgregarEstudioRealizado } from "../../domain/usecases/agregar-estudio-realizado";
import { CasoUsoModificarEstudioRealizado } from "../../domain/usecases/modificar-estudio-realizado";
import { CasoUsoEliminarEstudioRealizado } from "../../domain/usecases/eliminar-estudio-realizado";
import { CasoUsoAgregarEstudioComplementario } from "../../domain/usecases/agregar-estudio-complementario";
import { CasoUsoModificarEstudioComplementario } from "../../domain/usecases/modificar-estudio-complementario";
import { CasoUsoEliminarEstudioComplementario } from "../../domain/usecases/eliminar-estudio-complementario";
import {
  DtoGuardarEstudioComplementario,
  DtoGuardarEstudioRealizado,
} from "../dto/guardar-estudio.dto";

/** Piso común para mutaciones de perfil actuales y futuras. */
const LIMITE_MUTACIONES_PERFIL = 20;

/** Perfil está disponible para todo usuario con una sesión válida. */
@Controller("profile")
export class ControladorPerfil {
  private readonly logger = new Logger(ControladorPerfil.name);

  constructor(
    private casoActualizarApariencia: CasoUsoActualizarApariencia,
    private casoListarActividad: CasoUsoListarActividad,
    private casoObtenerDatosPersonales: CasoUsoObtenerDatosPersonales,
    private casoActualizarDatosPersonales: CasoUsoActualizarDatosPersonales,
    private casoObtenerAvatar: CasoUsoObtenerAvatar,
    private casoActualizarAvatar: CasoUsoActualizarAvatar,
    private casoEliminarAvatar: CasoUsoEliminarAvatar,
    private casoCambiarContrasenia: CasoUsoCambiarContrasenia,
    private casoRotarSesionActual: CasoUsoRotarSesionActual,
    private casoCerrarSesion: CasoUsoCerrarSesion,
    private cookies: ServicioCookies,
    private casoAgregarCorreo: CasoUsoAgregarCorreo,
    private casoModificarCorreo: CasoUsoModificarCorreo,
    private casoEliminarCorreo: CasoUsoEliminarCorreo,
    private casoSeleccionarCorreoUso: CasoUsoSeleccionarCorreoUso,
    private casoActualizarVerificacionCorreo: CasoUsoActualizarVerificacionCorreo,
    private casoListarSesiones: CasoUsoListarSesiones,
    private casoCerrarOtraSesion: CasoUsoCerrarOtraSesion,
    private casoActualizarSegundoFactor: CasoUsoActualizarSegundoFactor,
    private casoListarNacionalidades: CasoUsoListarNacionalidades,
    private casoAgregarNacionalidad: CasoUsoAgregarNacionalidad,
    private casoEliminarNacionalidad: CasoUsoEliminarNacionalidad,
    private casoListarHobbies: CasoUsoListarHobbies,
    private casoAgregarHobby: CasoUsoAgregarHobby,
    private casoModificarHobby: CasoUsoModificarHobby,
    private casoEliminarHobby: CasoUsoEliminarHobby,
    private casoListarSeguros: CasoUsoListarSeguros,
    private casoAgregarSeguro: CasoUsoAgregarSeguro,
    private casoModificarSeguro: CasoUsoModificarSeguro,
    private casoEliminarSeguro: CasoUsoEliminarSeguro,
    private casoListarDocumentos: CasoUsoListarDocumentos,
    private casoAgregarDocumento: CasoUsoAgregarDocumento,
    private casoModificarDocumento: CasoUsoModificarDocumento,
    private casoEliminarDocumento: CasoUsoEliminarDocumento,
    private casoListarTelefonos: CasoUsoListarTelefonos,
    private casoAgregarTelefono: CasoUsoAgregarTelefono,
    private casoModificarTelefono: CasoUsoModificarTelefono,
    private casoEliminarTelefono: CasoUsoEliminarTelefono,
    private casoListarEstudios: CasoUsoListarEstudios,
    private casoAgregarEstudioRealizado: CasoUsoAgregarEstudioRealizado,
    private casoModificarEstudioRealizado: CasoUsoModificarEstudioRealizado,
    private casoEliminarEstudioRealizado: CasoUsoEliminarEstudioRealizado,
    private casoAgregarEstudioComplementario: CasoUsoAgregarEstudioComplementario,
    private casoModificarEstudioComplementario: CasoUsoModificarEstudioComplementario,
    private casoEliminarEstudioComplementario: CasoUsoEliminarEstudioComplementario,
    private configuracion: ConfigService,
  ) {}

  @Get("studies")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listarEstudios(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.casoListarEstudios.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
    );
  }

  @Post("studies/academic")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  agregarEstudioRealizado(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoGuardarEstudioRealizado,
    @Req() peticion: Request,
  ) {
    return this.casoAgregarEstudioRealizado.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("studies/academic/:id")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  modificarEstudioRealizado(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoGuardarEstudioRealizado,
    @Req() peticion: Request,
  ) {
    return this.casoModificarEstudioRealizado.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_estudios_realizados: id, ...dto },
      crearContextoSolicitud(peticion),
    );
  }

  @Delete("studies/academic/:id")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  eliminarEstudioRealizado(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() peticion: Request,
  ) {
    return this.casoEliminarEstudioRealizado.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      id,
      crearContextoSolicitud(peticion),
    );
  }

  @Post("studies/complementary")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  agregarEstudioComplementario(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoGuardarEstudioComplementario,
    @Req() peticion: Request,
  ) {
    return this.casoAgregarEstudioComplementario.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("studies/complementary/:id")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  modificarEstudioComplementario(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: DtoGuardarEstudioComplementario,
    @Req() peticion: Request,
  ) {
    return this.casoModificarEstudioComplementario.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_estudios_complementarios: id, ...dto },
      crearContextoSolicitud(peticion),
    );
  }

  @Delete("studies/complementary/:id")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  eliminarEstudioComplementario(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() peticion: Request,
  ) {
    return this.casoEliminarEstudioComplementario.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      id,
      crearContextoSolicitud(peticion),
    );
  }

  @Get("documents")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listarDocumentos(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.casoListarDocumentos.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
    );
  }

  @Post("documents")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  agregarDocumento(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoGuardarDocumento,
    @Req() peticion: Request,
  ) {
    return this.casoAgregarDocumento.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("documents/:id_personas_documentos")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  modificarDocumento(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_documentos", new ParseUUIDPipe({ version: "4" }))
    id_personas_documentos: string,
    @Body() dto: DtoGuardarDocumento,
    @Req() peticion: Request,
  ) {
    return this.casoModificarDocumento.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_documentos, ...dto },
      crearContextoSolicitud(peticion),
    );
  }

  @Delete("documents/:id_personas_documentos")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  eliminarDocumento(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_documentos", new ParseUUIDPipe({ version: "4" }))
    id_personas_documentos: string,
    @Req() peticion: Request,
  ) {
    return this.casoEliminarDocumento.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_documentos },
      crearContextoSolicitud(peticion),
    );
  }

  @Get("phones")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listarTelefonos(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.casoListarTelefonos.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
    );
  }

  @Post("phones")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  agregarTelefono(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoGuardarTelefono,
    @Req() peticion: Request,
  ) {
    return this.casoAgregarTelefono.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("phones/:id_personas_telefonos")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  modificarTelefono(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_telefonos", new ParseUUIDPipe({ version: "4" }))
    id_personas_telefonos: string,
    @Body() dto: DtoGuardarTelefono,
    @Req() peticion: Request,
  ) {
    return this.casoModificarTelefono.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_telefonos, ...dto },
      crearContextoSolicitud(peticion),
    );
  }

  @Delete("phones/:id_personas_telefonos")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  eliminarTelefono(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_telefonos", new ParseUUIDPipe({ version: "4" }))
    id_personas_telefonos: string,
    @Req() peticion: Request,
  ) {
    return this.casoEliminarTelefono.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_telefonos },
      crearContextoSolicitud(peticion),
    );
  }

  @Get("insurance")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listarSeguros(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.casoListarSeguros.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
    );
  }

  @Post("insurance")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  agregarSeguro(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoGuardarSeguro,
    @Req() peticion: Request,
  ) {
    return this.casoAgregarSeguro.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("insurance/:id_personas_seguros")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  modificarSeguro(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_seguros", new ParseUUIDPipe({ version: "4" }))
    id: string,
    @Body() dto: DtoGuardarSeguro,
    @Req() peticion: Request,
  ) {
    return this.casoModificarSeguro.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_seguros: id, ...dto },
      crearContextoSolicitud(peticion),
    );
  }

  @Delete("insurance/:id_personas_seguros")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  eliminarSeguro(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_seguros", new ParseUUIDPipe({ version: "4" }))
    id: string,
    @Req() peticion: Request,
  ) {
    return this.casoEliminarSeguro.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_seguros: id },
      crearContextoSolicitud(peticion),
    );
  }

  @Get("nationalities")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listarNacionalidades(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.casoListarNacionalidades.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
    );
  }

  @Post("nationalities")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  agregarNacionalidad(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoAgregarNacionalidad,
    @Req() peticion: Request,
  ) {
    return this.casoAgregarNacionalidad.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  @Delete("nationalities/:id_personas_nacionalidades")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  eliminarNacionalidad(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_nacionalidades", new ParseUUIDPipe({ version: "4" }))
    id_personas_nacionalidades: string,
    @Req() peticion: Request,
  ) {
    return this.casoEliminarNacionalidad.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_nacionalidades },
      crearContextoSolicitud(peticion),
    );
  }

  @Get("hobbies")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listarHobbies(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.casoListarHobbies.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
    );
  }

  @Post("hobbies")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  agregarHobby(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoAgregarHobby,
    @Req() peticion: Request,
  ) {
    return this.casoAgregarHobby.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  @Delete("hobbies/:id_personas_hobbies")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  eliminarHobby(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_hobbies", new ParseUUIDPipe({ version: "4" }))
    id_personas_hobbies: string,
    @Req() peticion: Request,
  ) {
    return this.casoEliminarHobby.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_hobbies },
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("hobbies/:id_personas_hobbies")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  modificarHobby(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_hobbies", new ParseUUIDPipe({ version: "4" }))
    id_personas_hobbies: string,
    @Body() dto: DtoAgregarHobby,
    @Req() peticion: Request,
  ) {
    return this.casoModificarHobby.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_hobbies, ...dto },
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("two-factor")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  actualizarSegundoFactor(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoActualizarSegundoFactor,
    @Req() peticion: Request,
  ) {
    return this.casoActualizarSegundoFactor.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  @Get("sessions")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listarSesiones(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.casoListarSesiones.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      usuario.sid,
    );
  }

  @Delete("sessions/:id_sesiones")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  cerrarOtraSesion(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_sesiones", new ParseUUIDPipe({ version: "4" }))
    id_sesiones: string,
    @Req() peticion: Request,
  ) {
    return this.casoCerrarOtraSesion.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      usuario.sid,
      id_sesiones,
      crearContextoSolicitud(peticion),
    );
  }

  @Post("emails")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  agregarCorreo(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoAgregarCorreo,
    @Req() peticion: Request,
  ) {
    return this.casoAgregarCorreo.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("emails/:id_personas_correos/address")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  modificarCorreo(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_correos", new ParseUUIDPipe({ version: "4" }))
    id_personas_correos: string,
    @Body() dto: DtoModificarCorreo,
    @Req() peticion: Request,
  ) {
    return this.casoModificarCorreo.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_correos, correo: dto.correo },
      crearContextoSolicitud(peticion),
    );
  }

  @Delete("emails/:id_personas_correos")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  eliminarCorreo(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_correos", new ParseUUIDPipe({ version: "4" }))
    id_personas_correos: string,
    @Req() peticion: Request,
  ) {
    return this.casoEliminarCorreo.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_correos },
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("emails/use")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  seleccionarCorreoUso(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoSeleccionarCorreoUso,
    @Req() peticion: Request,
  ) {
    return this.casoSeleccionarCorreoUso.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("emails/:id_personas_correos/verification")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  actualizarVerificacionCorreo(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param("id_personas_correos", new ParseUUIDPipe({ version: "4" }))
    id_personas_correos: string,
    @Body() dto: DtoActualizarVerificacionCorreo,
    @Req() peticion: Request,
  ) {
    return this.casoActualizarVerificacionCorreo.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      { id_personas_correos, verificado: dto.verificado },
      crearContextoSolicitud(peticion),
    );
  }

  @Patch("password")
  @HttpCode(200)
  @Throttle({
    default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 },
  })
  async cambiarContrasenia(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoCambiarContrasenia,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const contexto = crearContextoSolicitud(peticion);
    const tokenRefresco = peticion.cookies?.refresh_token as string | undefined;
    if (!tokenRefresco) {
      throw new UnauthorizedException("auth.sessionInvalid");
    }
    const resultado = await this.casoCambiarContrasenia.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      usuario.sid,
      dto,
      contexto,
    );
    let tokens: TokensSesion;
    try {
      tokens = await this.casoRotarSesionActual.ejecutar(
        usuario.sub,
        usuario.sid,
        tokenRefresco,
        contexto,
      );
    } catch (error) {
      // Falla cerrada: si no podemos sustituir los tokens, intentamos revocar
      // la sesión actual y limpiamos cookies para no conservar credenciales viejas.
      await this.casoCerrarSesion
        .ejecutar(usuario.sid, contexto)
        .catch((fallo) => {
          this.logger.error(
            `No se pudo revocar la sesión tras fallar su rotación: sid=${usuario.sid}`,
            fallo instanceof Error ? fallo.stack : String(fallo),
          );
        });
      this.cookies.limpiarSesion(respuesta);
      throw error;
    }
    this.cookies.ponerSesion(respuesta, tokens);
    return resultado;
  }

  @Get("avatar")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async obtenerAvatar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const avatar = await this.casoObtenerAvatar.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
    );
    respuesta.setHeader("content-type", avatar.tipo_mime);
    const version = avatar.version.split("/").at(-1) ?? avatar.version;
    const ttl = this.configuracion.getOrThrow<number>(
      "AVATAR_CACHE_TTL_SECONDS",
    );
    // La URL contiene esta versión. Al cambiar el avatar cambia la URL, por lo
    // que nunca se reutiliza el binario anterior aunque tenga una caché larga.
    respuesta.setHeader("cache-control", `private, max-age=${ttl}, immutable`);
    respuesta.setHeader("etag", `"${version}"`);
    respuesta.setHeader("x-content-type-options", "nosniff");
    respuesta.setHeader("content-disposition", 'inline; filename="avatar.jpg"');
    respuesta.setHeader("cross-origin-resource-policy", "same-origin");
    respuesta.setHeader(
      "content-security-policy",
      "default-src 'none'; sandbox",
    );
    return new StreamableFile(avatar.contenido);
  }

  @Post("avatar")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  @UseInterceptors(InterceptorErroresAvatar, FileInterceptor("avatar"))
  actualizarAvatar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Req() peticion: Request,
  ) {
    if (!archivo) {
      throw new BadRequestException("profile.avatar.required");
    }
    return this.casoActualizarAvatar.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      {
        contenido: archivo.buffer,
        tipo_mime: archivo.mimetype,
        nombre_original: archivo.originalname,
      },
      crearContextoSolicitud(peticion),
    );
  }

  @Delete("avatar")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  eliminarAvatar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() peticion: Request,
  ) {
    return this.casoEliminarAvatar.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      crearContextoSolicitud(peticion),
    );
  }

  @Get("personal")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  obtenerDatosPersonales(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.casoObtenerDatosPersonales.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
    );
  }

  @Patch("personal")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  actualizarDatosPersonales(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoActualizarDatosPersonales,
    @Req() peticion: Request,
  ) {
    return this.casoActualizarDatosPersonales.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }

  @Get("activity")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listarActividad(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() consulta: DtoListarActividad,
  ) {
    return this.casoListarActividad.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      consulta.pagina,
      consulta.limite,
    );
  }

  @Patch("appearance")
  @HttpCode(200)
  @Throttle({ default: { limit: LIMITE_MUTACIONES_PERFIL, ttl: 60_000 } })
  actualizarApariencia(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DtoActualizarApariencia,
    @Req() peticion: Request,
  ) {
    return this.casoActualizarApariencia.ejecutar(
      usuario.sub,
      usuario.fid_organizaciones,
      dto,
      crearContextoSolicitud(peticion),
    );
  }
}
