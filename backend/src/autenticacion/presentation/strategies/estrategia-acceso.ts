import { Injectable, UnauthorizedException } from "@nestjs/common"; // NestJS: provider y error 401
import { ConfigService } from "@nestjs/config"; // NestJS: lee variables de entorno / config
import { PassportStrategy } from "@nestjs/passport"; // NestJS: clase base para definir una estrategia Passport
import { ExtractJwt, Strategy } from "passport-jwt"; // passport-jwt: Strategy = valida JWT; ExtractJwt = de dónde sacar el token
import type { Request } from "express"; // express: tipo de la petición HTTP
import type {
  PayloadAcceso,
  UsuarioAutenticado,
} from "../../domain/entities/tipos";
import { ServicioRelojBaseDatos } from "../../../comun/reloj-base-datos/servicio-reloj-base-datos";
import { FuenteDatosContextoUsuarioPrisma } from "../../data/datasources/contexto-usuario-prisma.datasource";

// Extractor propio: saca el token de una cookie por nombre (passport-jwt no trae uno para cookies).
const desdeCookie =
  (nombre: string) =>
  (peticion: Request): string | null =>
    (peticion?.cookies?.[nombre] as string) ?? null;

@Injectable()
export class EstrategiaAcceso extends PassportStrategy(Strategy, "jwt-acceso") {
  // "jwt-acceso" = nombre de la estrategia; los guardias la referencian por ese nombre
  constructor(
    config: ConfigService,
    private reloj: ServicioRelojBaseDatos,
    private contextoUsuarios: FuenteDatosContextoUsuarioPrisma,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([desdeCookie("access_token")]), // passport-jwt: usa nuestro extractor de cookie
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"), // getOrThrow: lanza si falta la env (fail-fast)
      algorithms: ["HS256"], // allowlist explícita: no confiar en el alg declarado por el token
      ignoreExpiration: true, // exp se valida abajo contra el reloj de PostgreSQL
      issuer: config.getOrThrow<string>("JWT_ISSUER"), // passport-jwt: rechaza si el iss no coincide
      audience: config.getOrThrow<string>("JWT_AUDIENCE"), // passport-jwt: rechaza si el aud no coincide
    });
  }

  // Passport llama validate() con el payload ya verificado; lo retornado queda en req.user.
  async validate(payload: PayloadAcceso): Promise<UsuarioAutenticado> {
    if (
      !payload.exp ||
      !Number.isInteger(payload.gen) ||
      payload.gen < 0 ||
      (await this.reloj.tokenExpirado(payload.exp))
    ) {
      throw new UnauthorizedException("auth.sessionExpired");
    }
    // En una consulta recupera sesión + autorización ACTUAL. El JWT identifica la
    // sesión, pero roles/permisos mutables siempre se reemplazan por los de PostgreSQL.
    const vigente = await this.contextoUsuarios.obtenerPorSesion(
      payload.sid,
      payload.gen,
    );
    if (
      !vigente ||
      vigente.revocada ||
      vigente.contexto.id_usuarios !== payload.sub
    ) {
      throw new UnauthorizedException("auth.sessionInvalid");
    }
    return {
      ...payload,
      fid_organizaciones: vigente.contexto.fid_organizaciones,
      usuario: vigente.contexto.usuario,
      roles: vigente.contexto.roles.map((rol) => rol.codigo),
      permisos: vigente.contexto.permisos,
      idioma: vigente.contexto.preferencias.idioma ?? payload.idioma,
      contexto: vigente.contexto,
    };
  }
}
