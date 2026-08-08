import { Injectable, UnauthorizedException } from "@nestjs/common"; // NestJS: provider y error 401
import { ConfigService } from "@nestjs/config"; // NestJS: lee variables de entorno / config
import { PassportStrategy } from "@nestjs/passport"; // NestJS: clase base para definir una estrategia Passport
import { ExtractJwt, Strategy } from "passport-jwt"; // passport-jwt: Strategy = valida JWT; ExtractJwt = de dónde sacar el token
import type { Request } from "express"; // express: tipo de la petición HTTP
import type { PayloadRefresco } from "../../domain/entities/tipos";
import { ServicioRelojBaseDatos } from "../../../comun/reloj-base-datos/servicio-reloj-base-datos";

// Extractor propio: saca el token de una cookie por nombre.
const desdeCookie =
  (nombre: string) =>
  (peticion: Request): string | null =>
    (peticion?.cookies?.[nombre] as string) ?? null;

export interface RefrescoConToken extends PayloadRefresco {
  tokenRefresco: string;
}

@Injectable()
export class EstrategiaRefresco extends PassportStrategy(
  Strategy,
  "jwt-refresco", // nombre de la estrategia; GuardiaRefresco la referencia por aquí
) {
  constructor(
    config: ConfigService,
    private reloj: ServicioRelojBaseDatos,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([desdeCookie("refresh_token")]), // passport-jwt: token desde la cookie refresh
      secretOrKey: config.getOrThrow<string>("JWT_REFRESH_SECRET"), // getOrThrow: lanza si falta la env
      algorithms: ["HS256"], // allowlist explícita: no confiar en el alg declarado por el token
      ignoreExpiration: true, // exp se valida abajo contra el reloj de PostgreSQL
      issuer: config.getOrThrow<string>("JWT_ISSUER"), // passport-jwt: rechaza si el iss no coincide
      audience: config.getOrThrow<string>("JWT_AUDIENCE"), // passport-jwt: rechaza si el aud no coincide
      passReqToCallback: true, // passport-jwt: pasa también la Request a validate() (para leer el token crudo)
    });
  }

  // Passport llama validate(); aquí adjuntamos el token crudo para poder compararlo con su hash en DB.
  async validate(
    peticion: Request,
    payload: PayloadRefresco,
  ): Promise<RefrescoConToken> {
    if (!payload.exp || (await this.reloj.tokenExpirado(payload.exp))) {
      throw new UnauthorizedException("auth.sessionExpired");
    }
    const tokenRefresco = (peticion?.cookies?.refresh_token as string) ?? "";
    return { ...payload, tokenRefresco }; // queda en req.user
  }
}
