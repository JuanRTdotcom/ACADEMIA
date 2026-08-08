import {
  // NestJS @nestjs/common: decoradores de ruta y parámetros.
  Body, // @Body() → inyecta el cuerpo (JSON) de la petición
  Controller, // @Controller() → declara un controlador con prefijo de ruta
  Get, // @Get() → mapea un método HTTP GET
  HttpCode, // @HttpCode() → fija el código de respuesta
  type MessageEvent, // tipo de un evento SSE (data + opcionales)
  Post, // @Post() → mapea un método HTTP POST
  Req, // @Req() → inyecta el objeto Request de Express
  Res, // @Res() → inyecta el objeto Response de Express
  Sse, // @Sse() → declara un stream Server-Sent Events
  UseGuards, // @UseGuards() → aplica un guardia a la ruta
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler"; // NestJS: limita la frecuencia de peticiones (rate limit)
import { interval, map, merge, filter, type Observable } from "rxjs"; // RxJS: componer el flujo SSE
import type { Request, Response } from "express"; // Express: tipos de petición y respuesta HTTP
import { CasoUsoIngresar } from "../../domain/usecases/ingresar";
import { CasoUsoRefrescarSesion } from "../../domain/usecases/refrescar-sesion";
import { CasoUsoCerrarSesion } from "../../domain/usecases/cerrar-sesion";
import { ServicioCookies } from "../../../comun/cookies/servicio-cookies";
import { ServicioEventosSesion } from "../../../comun/eventos-sesion/servicio-eventos-sesion";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { DtoIngreso } from "../dto/ingreso.dto";
import { Publico } from "../decorators/publico.decorador";
import { UsuarioActual } from "../decorators/usuario-actual.decorador";
import { GuardiaRefresco } from "../guards/guardia-refresco";
import { GuardiaLimiteRefresco } from "../guards/guardia-limite-refresco";
import type { UsuarioAutenticado } from "../../domain/entities/tipos";
import type { RefrescoConToken } from "../strategies/estrategia-refresco";

@Controller("auth") // prefijo de ruta: todas las rutas cuelgan de /auth
export class ControladorAutenticacion {
  constructor(
    // DI: Nest inyecta estas instancias por el tipo.
    private ingresarCasoUso: CasoUsoIngresar,
    private refrescarCasoUso: CasoUsoRefrescarSesion,
    private cerrarSesionCasoUso: CasoUsoCerrarSesion,
    private cookies: ServicioCookies,
    private eventos: ServicioEventosSesion,
  ) {}

  /**
   * Stream SSE de eventos de sesión del usuario autenticado. Protegido por el guardia
   * de acceso global (sabe qué usuario y sesión es). Solo recibe los eventos dirigidos
   * a este usuario, y si el evento trae `sid`, únicamente a esa sesión. Un ping cada
   * 25s mantiene viva la conexión frente a proxies que cierran conexiones ociosas.
   */
  @Sse("events")
  eventos_sesion(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Observable<MessageEvent> {
    const revocaciones = this.eventos.flujo().pipe(
      filter(
        (e) =>
          e.fid_usuarios === usuario.sub &&
          (e.sid === undefined || e.sid === usuario.sid),
      ),
      map((e): MessageEvent => ({ data: { tipo: e.tipo } })), // evento por defecto → lo capta onmessage
    );
    // Heartbeat como evento CON nombre (`event: ping`): mantiene viva la conexión pero
    // el onmessage del cliente no lo recibe → sin parseo de pings. (Estándar SSE.)
    const ping = interval(25_000).pipe(
      map((): MessageEvent => ({ type: "ping", data: "" })),
    );
    return merge(revocaciones, ping);
  }

  @Publico() // GuardiaAcceso permite esta ruta sin exigir access token
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) // rate limit por IP; no reemplaza intentos_fallidos de la cuenta
  @Post("login")
  @HttpCode(200) // por defecto POST devuelve 201; forzamos 200
  async ingresar(
    @Body() dto: DtoIngreso, // cuerpo validado por DtoIngreso
    @Req() peticion: Request,
    @Res({ passthrough: true }) res: Response, // passthrough: dejamos que Nest siga manejando la respuesta (para poder return)
  ) {
    const { usuario, ...tokens } = await this.ingresarCasoUso.ejecutar(
      dto,
      crearContextoSolicitud(peticion),
    );
    this.cookies.ponerSesion(res, tokens);
    return { usuario };
  }

  @Publico() // el refresh no lleva access token; lo protege su propio guardia
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) // primera capa: IP, antes de validar JWT
  @UseGuards(GuardiaRefresco, GuardiaLimiteRefresco) // segunda capa: familia firmada
  @Post("refresh")
  @HttpCode(200)
  async refrescar(
    @UsuarioActual() payload: RefrescoConToken, // payload del refresh (lo dejó la estrategia en req.user)
    @Req() peticion: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.refrescarCasoUso.ejecutar(
      payload.sub,
      payload.sid,
      payload.gen,
      payload.tokenRefresco,
      crearContextoSolicitud(peticion),
    );
    this.cookies.ponerSesion(res, tokens);
    return { ok: true };
  }

  @Publico()
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) // rate limit por IP, igual que login/refresh
  @UseGuards(GuardiaRefresco)
  @Post("logout")
  @HttpCode(200)
  async cerrarSesion(
    @UsuarioActual() payload: RefrescoConToken,
    @Req() peticion: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.cerrarSesionCasoUso.ejecutar(
      payload.sid,
      crearContextoSolicitud(peticion),
    );
    this.cookies.limpiarSesion(res);
    return { ok: true };
  }

  @Get("me") // protegido por el guardia global de acceso (no es @Publico)
  yo(@UsuarioActual() usuario: UsuarioAutenticado) {
    // La estrategia ya reconstruyó este contexto desde DB en la misma petición.
    return usuario.contexto;
  }
}
