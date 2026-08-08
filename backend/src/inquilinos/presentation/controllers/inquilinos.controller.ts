import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Req,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { Publico } from "../../../autenticacion/presentation/decorators/publico.decorador";
import { CasoUsoObtenerInquilinoActual } from "../../domain/usecases/obtener-inquilino-actual";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";

@Controller("tenants")
export class ControladorInquilinos {
  constructor(private obtenerInquilinoActual: CasoUsoObtenerInquilinoActual) {}

  /**
   * Devuelve el tenant del host actual o 404 si no existe/está inactivo.
   * Público (no exige sesión): lo consulta el frontend al cargar cualquier ruta
   * para bloquear subdomains no registrados. GET → sin CSRF.
   */
  @Publico()
  @Get("current")
  actual(@Req() peticion: Request) {
    return this.obtenerInquilinoActual.ejecutar(
      crearContextoSolicitud(peticion),
    );
  }

  @Publico()
  @Get("current/media/:type/:version")
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async medio(
    @Param("type") tipo: string,
    @Param("version") version: string,
    @Req() peticion: Request,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const esMarca = [
      "escudo",
      "escudo_oscuro",
      "imagotipo",
      "imagotipo_oscuro",
      "login_escudo",
      "login_escudo_oscuro",
    ].includes(tipo);
    const versionValida = esMarca
      ? /^[0-9a-f-]{36}\.(?:png|jpg|webp)$/i.test(version)
      : tipo === "portada" && /^[0-9a-f-]{36}\.webp$/i.test(version);
    if ((!esMarca && tipo !== "portada") || !versionValida) {
      throw new BadRequestException("companies.media.invalidRequest");
    }
    const medio = await this.obtenerInquilinoActual.leerMedio(
      crearContextoSolicitud(peticion),
      tipo as
        | "escudo"
        | "escudo_oscuro"
        | "imagotipo"
        | "imagotipo_oscuro"
        | "portada"
        | "login_escudo"
        | "login_escudo_oscuro",
      version,
    );
    respuesta.setHeader("content-type", medio.tipo_mime);
    respuesta.setHeader("cache-control", "public, max-age=31536000, immutable");
    respuesta.setHeader("etag", `"${version}"`);
    respuesta.setHeader("x-content-type-options", "nosniff");
    respuesta.setHeader("cross-origin-resource-policy", "same-origin");
    return new StreamableFile(medio.contenido);
  }
}
