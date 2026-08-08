import {
  HttpException, // base de errores HTTP conocidos; se conserva su código original
  // NestJS: excepciones que Nest convierte en respuestas HTTP.
  Injectable, // marca la clase como provider inyectable (DI)
  InternalServerErrorException, // → 500 genérico para fallos inesperados
  Logger, // registra el detalle interno sin exponerlo al cliente
  UnauthorizedException, // → 401 (credenciales/sesión inválidas)
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config"; // NestJS: lee variables de entorno / config
import { JwtService } from "@nestjs/jwt"; // NestJS: firma y verifica JWT
import { randomUUID } from "node:crypto"; // Node: genera un UUID v4 (ids de sesión/dispositivo)
import * as argon2 from "argon2"; // lib argon2: hashea y verifica únicamente contraseñas
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { Prisma } from "../../../../prisma/generated/client/client"; // tipo del cliente transaccional
import { PrismaService } from "../../../comun/prisma.service"; // ORM: cliente de base de datos
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria"; // auditoría transversal (comun)
import { EVENTOS_FUNCIONALES } from "../../../comun/auditoria/eventos-funcionales";
import { ServicioEventosSesion } from "../../../comun/eventos-sesion/servicio-eventos-sesion"; // bus SSE de revocaciones
import type { ComandoIngreso } from "../../domain/entities/comando-ingreso";
import { normalizarIdioma } from "../../../comun/i18n/idiomas"; // normaliza el idioma preferido a uno soportado
import { ServicioRelojBaseDatos } from "../../../comun/reloj-base-datos/servicio-reloj-base-datos";
import type { VentanaTemporal } from "../../../comun/reloj-base-datos/servicio-reloj-base-datos";
import { resolverSubdomain } from "../../../comun/inquilinos/resolver-host"; // parser host→slug compartido
import { FuenteDatosContextoUsuarioPrisma } from "./contexto-usuario-prisma.datasource";
import { ServicioHashTokenRefresco } from "../security/hash-token-refresco.service";
import type { ContextoUsuario } from "../../domain/entities/tipos";
import type {
  TokensEmitidos,
  UsuarioPublico,
} from "../../domain/entities/resultado-autenticacion";

/** Motivo del intento de ingreso (dominio de auth); va en los metadatos de auditoría. */
type MotivoIngreso =
  | "correcto"
  | "organizacion_invalida"
  | "usuario_inexistente"
  | "contrasenia_invalida"
  | "cuenta_bloqueada"
  | "cuenta_inactiva";

// Código único de rechazo del login. Mismo código en todos los casos para no
// filtrar cuál falló (anti-enumeración). El filtro i18n lo traduce al idioma.
const CODIGO_INGRESO_INVALIDO = "auth.invalidCredentials";

@Injectable()
export class FuenteDatosAutenticacionPrisma {
  private readonly logger = new Logger(FuenteDatosAutenticacionPrisma.name);

  constructor(
    // DI: Nest inyecta estas instancias por su tipo.
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private auditoria: ServicioAuditoria,
    private reloj: ServicioRelojBaseDatos,
    private eventos: ServicioEventosSesion,
    private contextoUsuarios: FuenteDatosContextoUsuarioPrisma,
    private hashTokensRefresco: ServicioHashTokenRefresco,
  ) {}

  // --- helpers de petición ------------------------------------------------

  private resolverSlugOrganizacion(
    peticion: ContextoSolicitud,
    alternativa?: string,
  ): string | undefined {
    // Host original del navegador. SvelteKit (o nginx/Cloudflare en prod) lo reenvía
    // en X-Forwarded-Host; si no, se usa el Host directo. El parseo host→slug vive en
    // comun/inquilinos (compartido con la validación de tenant), para no duplicarlo.
    const reenviado = peticion.host_reenviado ?? peticion.host ?? "";
    const base = this.config.getOrThrow<string>("APP_BASE_DOMAIN");

    // Subdomain del host; si no hay, cae al slug alternativo del DTO (cliente de API).
    return (
      resolverSubdomain(reenviado, base) ?? (alternativa?.trim() || undefined)
    );
  }

  /** Audita todo ingreso; solo el éxito crea una actividad visible. */
  private auditarIngreso(
    peticion: ContextoSolicitud,
    resultado: "exito" | "fallo",
    motivo: MotivoIngreso,
    fid_organizaciones?: string,
    fid_usuarios?: string,
    cliente?: Prisma.TransactionClient,
  ): Promise<void> {
    const datosBase = {
      entidad: "usuarios",
      id_entidad: fid_usuarios,
      fid_organizaciones,
      fid_usuarios,
      metadatos: { motivo },
      peticion,
    };
    return resultado === "exito"
      ? this.auditoria.registrarConEvento(
          {
            ...datosBase,
            accion: EVENTOS_FUNCIONALES.AUTENTICACION_INGRESO_EXITO.codigo,
          },
          cliente,
        )
      : this.auditoria.registrar(
          { ...datosBase, accion: "autenticacion.ingreso.fallo" },
          cliente,
        );
  }

  /** Audita el motivo real, pero siempre responde con el mismo código público. */
  private async rechazarIngreso(
    peticion: ContextoSolicitud,
    motivo: MotivoIngreso,
    fid_organizaciones?: string,
    fid_usuarios?: string,
  ): Promise<never> {
    await this.auditarIngreso(
      peticion,
      "fallo",
      motivo,
      fid_organizaciones,
      fid_usuarios,
    );
    throw new UnauthorizedException(CODIGO_INGRESO_INVALIDO);
  }

  private metadatosPeticion(peticion: ContextoSolicitud) {
    return {
      agente_usuario: peticion.agente_usuario,
      ip: peticion.ip,
    };
  }

  /**
   * Claims iss (emisor) y aud (audiencia) comunes a todos los tokens. Deben
   * coincidir al firmar aquí y al verificar en las estrategias Passport; así un
   * token de otro sistema/entorno no se acepta por error. Son valores fijos de
   * configuración (iguales en toda instancia), no requieren sincronización.
   */
  private opcionesEmisor(): {
    issuer: string;
    audience: string;
    algorithm: "HS256";
  } {
    return {
      issuer: this.config.getOrThrow("JWT_ISSUER"),
      audience: this.config.getOrThrow("JWT_AUDIENCE"),
      algorithm: "HS256",
    };
  }

  private epoch(fecha: Date): number {
    return Math.floor(fecha.getTime() / 1000);
  }

  // --- contraseñas --------------------------------------------------------

  // Hash señuelo cacheado: se genera una sola vez y sirve para gastar el mismo
  // tiempo de argon2 cuando el usuario o la credencial no existen. Sin esto, un
  // usuario inexistente respondería mucho más rápido (no corre argon2) y permitiría
  // enumerar qué usuarios existen midiendo el tiempo de respuesta.
  private promesaHashSenuelo: Promise<string> | null = null;

  private obtenerHashSenuelo(): Promise<string> {
    if (!this.promesaHashSenuelo) {
      this.promesaHashSenuelo = argon2.hash("senuelo-anti-enumeracion", {
        type: argon2.argon2id,
      });
    }
    return this.promesaHashSenuelo;
  }

  /** Corre un verify contra el hash señuelo para igualar el tiempo de respuesta. */
  private async gastarTiempoVerificacion(contrasenia: string): Promise<void> {
    const hash = await this.obtenerHashSenuelo();
    await argon2.verify(hash, contrasenia).catch(() => false); // resultado descartado; solo interesa el tiempo
  }

  /** PostgreSQL decide si el bloqueo sigue vigente usando su propio reloj UTC. */
  private async tieneBloqueoVigente(id_usuarios: string): Promise<boolean> {
    const [resultado] = await this.prisma.$queryRaw<
      { bloqueo_vigente: boolean }[]
    >`
      SELECT COALESCE(
        bloqueado_hasta > CURRENT_TIMESTAMP,
        false
      ) AS bloqueo_vigente
      FROM seguridad.usuarios
      WHERE id_usuarios = ${id_usuarios}::uuid
    `;
    return resultado?.bloqueo_vigente ?? false;
  }

  hashearContrasenia(plano: string): Promise<string> {
    return argon2.hash(plano, { type: argon2.argon2id }); // argon2id: variante recomendada (resistente a GPU y side-channel)
  }

  // --- ingreso (login) ----------------------------------------------------

  async ingresar(
    dto: ComandoIngreso,
    peticion: ContextoSolicitud,
  ): Promise<TokensEmitidos & { usuario: ContextoUsuario }> {
    try {
      return await this.procesarIngreso(dto, peticion);
    } catch (error) {
      // Los errores esperados conservan su 400/401. Solo ocultamos detalles de
      // Prisma, red o programación para que no salgan como respuesta sin tratar.
      if (error instanceof HttpException) throw error;

      const detalle = error instanceof Error ? error.stack : String(error);
      this.logger.error("Fallo inesperado durante el ingreso", detalle);
      throw new InternalServerErrorException("auth.loginProcessingError");
    }
  }

  private async procesarIngreso(
    dto: ComandoIngreso,
    peticion: ContextoSolicitud,
  ): Promise<TokensEmitidos & { usuario: ContextoUsuario }> {
    // Paso 1: resolver y validar la organización. Si falla, no se busca usuario,
    // credencial, roles ni sesión. Argon2 se ejecuta como señuelo y la respuesta
    // pública siempre es "Credenciales inválidas" para no revelar organizaciones.
    const slug = this.resolverSlugOrganizacion(peticion, dto.slug_organizacion);
    if (!slug) {
      await this.gastarTiempoVerificacion(dto.contrasenia);
      return this.rechazarIngreso(peticion, "organizacion_invalida");
    }

    const organizacion = await this.prisma.organizaciones.findFirst({
      where: { slug, estado: 1, eliminado_en: null },
      select: { id_organizaciones: true, estado: true },
    });
    if (!organizacion) {
      await this.gastarTiempoVerificacion(dto.contrasenia);
      return this.rechazarIngreso(peticion, "organizacion_invalida");
    }
    if (organizacion.estado !== 1) {
      await this.gastarTiempoVerificacion(dto.contrasenia);
      return this.rechazarIngreso(
        peticion,
        "organizacion_invalida",
        organizacion.id_organizaciones,
      );
    }

    // Paso 2: buscar y validar el usuario dentro de la organización ya validada.
    const usuario = await this.prisma.usuarios.findFirst({
      // La unicidad es parcial: una baja lógica libera el alias. Nunca puede
      // autenticarse una fila eliminada, aunque conserve su historial.
      where: {
        fid_organizaciones: organizacion.id_organizaciones,
        usuario: dto.usuario.trim().toUpperCase(),
        eliminado_en: null,
      },
      select: {
        id_usuarios: true,
        fid_organizaciones: true,
        usuario: true,
        estado: true,
        estado_cuenta: true,
        bloqueado_hasta: true,
      },
    });
    if (!usuario) {
      // Gasta el mismo tiempo de argon2 que un usuario real, para no revelar por
      // timing que este usuario no existe.
      await this.gastarTiempoVerificacion(dto.contrasenia);
      return this.rechazarIngreso(
        peticion,
        "usuario_inexistente",
        organizacion.id_organizaciones,
      );
    }

    const bloqueoVigente = await this.tieneBloqueoVigente(usuario.id_usuarios);
    if (bloqueoVigente) {
      // Aunque ya sabemos que no puede ingresar, ejecutamos Argon2 igualmente.
      // Así una cuenta bloqueada no responde notablemente más rápido que una
      // contraseña incorrecta y no revela su estado mediante tiempos.
      await this.gastarTiempoVerificacion(dto.contrasenia);
      return this.rechazarIngreso(
        peticion,
        "cuenta_bloqueada",
        organizacion.id_organizaciones,
        usuario.id_usuarios,
      );
    }

    // Paso 3: buscar la contraseña solo después de validar organización y usuario.
    const credencialContrasenia = await this.prisma.credenciales.findFirst({
      where: {
        fid_usuarios: usuario.id_usuarios,
        tipo: "contrasenia",
        estado: 1,
        hash_contrasenia: { not: null },
      },
      select: { hash_contrasenia: true },
    });
    if (!credencialContrasenia?.hash_contrasenia) {
      // Igual que arriba: iguala el tiempo aunque no haya contraseña que verificar.
      await this.gastarTiempoVerificacion(dto.contrasenia);
      return this.rechazarIngreso(
        peticion,
        "contrasenia_invalida",
        organizacion.id_organizaciones,
        usuario.id_usuarios,
      );
    }

    const valido = await argon2
      .verify(credencialContrasenia.hash_contrasenia, dto.contrasenia) // argon2: compara la contraseña con el hash
      .catch(() => false);

    // Estado de cuenta ANTES de tocar el contador: una cuenta inactiva/dada de baja
    // igual no puede ingresar, así que no debe acumular intentos_fallidos ni bloquearse.
    // argon2 ya se ejecutó arriba, por lo que el tiempo de respuesta se mantiene parejo
    // y el código público sigue siendo el mismo 401 (no filtra el estado).
    if (usuario.estado !== 1 || usuario.estado_cuenta !== "activo") {
      return this.rechazarIngreso(
        peticion,
        "cuenta_inactiva",
        organizacion.id_organizaciones,
        usuario.id_usuarios,
      );
    }
    if (!valido) {
      await this.registrarIntentoFallido(
        peticion,
        organizacion.id_organizaciones,
        usuario.id_usuarios,
      );
      throw new UnauthorizedException(CODIGO_INGRESO_INVALIDO);
    }

    // Fase 2: carga en una sola forma el contexto que usarán login, SSR y guardias.
    const contexto = await this.contextoUsuarios.obtenerPorUsuario(
      usuario.id_usuarios,
    );
    if (!contexto) {
      return this.rechazarIngreso(
        peticion,
        "cuenta_inactiva",
        organizacion.id_organizaciones,
        usuario.id_usuarios,
      );
    }

    const publico: UsuarioPublico = {
      id_usuarios: contexto.id_usuarios,
      fid_organizaciones: contexto.fid_organizaciones,
      usuario: contexto.usuario,
      roles: contexto.roles.map((rol) => rol.codigo),
      permisos: contexto.permisos,
      // Idioma del usuario; si no tiene, cae al default (inglés). Va al token.
      idioma: normalizarIdioma(contexto.preferencias.idioma),
    };
    const tokens = await this.crearSesionIngreso(
      publico,
      peticion,
      dto.uid_dispositivo,
      dto.plataforma,
    );

    return { ...tokens, usuario: contexto };
  }

  /** Contador, bloqueo y auditoría fallan o se guardan juntos. */
  private async registrarIntentoFallido(
    peticion: ContextoSolicitud,
    fid_organizaciones: string,
    id_usuarios: string,
  ): Promise<void> {
    // Política de bloqueo por configuración (env), no valores fijos en código.
    const maxIntentos = Number(this.config.getOrThrow("LOGIN_MAX_INTENTOS"));
    const minutosBloqueo = Number(
      this.config.getOrThrow("LOGIN_BLOQUEO_MINUTOS"),
    );

    await this.prisma.$transaction(async (tx) => {
      // FOR UPDATE bloquea únicamente la fila de este usuario hasta el commit.
      // Otro intento simultáneo espera aquí y luego lee el contador ya actualizado,
      // evitando que dos peticiones calculen el mismo valor y pierdan un incremento.
      const [actual] = await tx.$queryRaw<
        {
          intentos_fallidos: number;
          bloqueado_hasta: Date | null;
          ahora_base: Date;
          bloqueo_hasta_nuevo: Date;
        }[]
      >`
        SELECT
          intentos_fallidos,
          bloqueado_hasta,
          CURRENT_TIMESTAMP AS ahora_base,
          CURRENT_TIMESTAMP + (${minutosBloqueo} * INTERVAL '1 minute') AS bloqueo_hasta_nuevo
        FROM seguridad.usuarios
        WHERE id_usuarios = ${id_usuarios}::uuid
        FOR UPDATE
      `;

      if (!actual) {
        throw new UnauthorizedException(CODIGO_INGRESO_INVALIDO);
      }
      const ahora = actual.ahora_base;

      // Si la cuenta venía de un bloqueo YA vencido (el usuario esperó el tiempo),
      // el contador arranca de cero y continúa desde este intento. Aquí nunca
      // llega una cuenta bloqueada vigente: eso se rechaza antes de verificar.
      const bloqueoVencido =
        actual.bloqueado_hasta != null && actual.bloqueado_hasta <= ahora;
      const previos = bloqueoVencido ? 0 : actual.intentos_fallidos;
      const intentos = previos + 1;
      const quedoBloqueado = intentos >= maxIntentos;

      await tx.usuarios.update({
        where: { id_usuarios },
        data: {
          intentos_fallidos: intentos,
          // Bloquea al llegar al límite; si no, limpia cualquier bloqueo vencido.
          bloqueado_hasta: quedoBloqueado ? actual.bloqueo_hasta_nuevo : null,
        },
      });

      await this.auditarIngreso(
        peticion,
        "fallo",
        quedoBloqueado ? "cuenta_bloqueada" : "contrasenia_invalida",
        fid_organizaciones,
        id_usuarios,
        tx,
      );
    });
  }

  // --- sesión inicial -----------------------------------------------------

  /**
   * Prepara criptografía fuera de la transacción y luego guarda únicamente las
   * escrituras relacionadas: contador, dispositivo, sesión y auditoría.
   */
  private async crearSesionIngreso(
    usuario: UsuarioPublico,
    peticion: ContextoSolicitud,
    uid: string,
    plataforma: ComandoIngreso["plataforma"],
  ): Promise<TokensEmitidos> {
    // DTO garantiza ambos datos. Aquí no se inventa UUID ni plataforma.
    const uid_dispositivo = uid.trim();
    const id_sesiones = randomUUID();
    const minutosAcceso = Number(
      this.config.getOrThrow("JWT_ACCESS_TTL_MINUTES"),
    );
    const horasRefresco = Number(
      this.config.getOrThrow("JWT_REFRESH_TTL_HOURS"),
    );
    const minutosInactividad = Number(
      this.config.getOrThrow("SESSION_IDLE_TTL_MINUTES"),
    );
    const diasAbsolutos = Number(
      this.config.getOrThrow("SESSION_ABSOLUTE_TTL_DAYS"),
    );
    const tiempos = await this.reloj.ventanaSesionInicial(
      minutosAcceso,
      horasRefresco,
      minutosInactividad,
      diasAbsolutos,
    );
    const iat = this.epoch(tiempos.ahora);

    const emisor = this.opcionesEmisor();
    const [tokenRefresco, tokenAcceso] = await Promise.all([
      this.jwt.signAsync(
        {
          sub: usuario.id_usuarios,
          sid: id_sesiones,
          gen: 0, // primera generación de la sesión
          iat,
          exp: this.epoch(tiempos.expira_refresco),
        },
        {
          secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
          ...emisor, // añade iss/aud al token de refresco
        },
      ),
      this.jwt.signAsync(
        {
          sub: usuario.id_usuarios,
          sid: id_sesiones,
          gen: 0,
          fid_organizaciones: usuario.fid_organizaciones,
          usuario: usuario.usuario,
          roles: usuario.roles,
          permisos: usuario.permisos,
          idioma: usuario.idioma, // respaldo; Accept-Language tiene prioridad
          iat,
          exp: this.epoch(tiempos.expira_acceso),
        },
        {
          secret: this.config.getOrThrow("JWT_ACCESS_SECRET"),
          ...emisor, // añade iss/aud al token de acceso
        },
      ),
    ]);
    const hash_token_refresco = this.hashTokensRefresco.crear(tokenRefresco);
    const { agente_usuario, ip } = this.metadatosPeticion(peticion);

    await this.prisma.$transaction(async (tx) => {
      // Bloquea y revalida la cuenta con el reloj de PostgreSQL. Impide que otro
      // intento cambie el bloqueo entre esta comprobación y la creación de sesión.
      const [cuenta] = await tx.$queryRaw<
        {
          estado: number;
          estado_cuenta: string;
          bloqueo_vigente: boolean;
        }[]
      >`
        SELECT
          estado,
          estado_cuenta,
          COALESCE(
            bloqueado_hasta > CURRENT_TIMESTAMP,
            false
          ) AS bloqueo_vigente
        FROM seguridad.usuarios
        WHERE id_usuarios = ${usuario.id_usuarios}::uuid
        FOR UPDATE
      `;
      if (
        !cuenta ||
        cuenta.estado !== 1 ||
        cuenta.estado_cuenta !== "activo" ||
        cuenta.bloqueo_vigente
      ) {
        throw new UnauthorizedException(CODIGO_INGRESO_INVALIDO);
      }

      await tx.usuarios.update({
        where: { id_usuarios: usuario.id_usuarios },
        data: { intentos_fallidos: 0, bloqueado_hasta: null },
      });

      // Upsert evita el patrón buscar→crear y resuelve el dispositivo en una operación.
      const dispositivo = await tx.dispositivos.upsert({
        where: {
          fid_usuarios_uid_dispositivo: {
            fid_usuarios: usuario.id_usuarios,
            uid_dispositivo,
          },
        },
        update: {
          plataforma,
          ultimo_acceso_en: tiempos.ahora,
          estado: 1,
        },
        create: {
          fid_usuarios: usuario.id_usuarios,
          uid_dispositivo,
          plataforma,
          ultimo_acceso_en: tiempos.ahora,
        },
        select: { id_dispositivos: true },
      });

      // Política del login: un usuario solo mantiene una sesión activa por
      // dispositivo. Si vuelve a ingresar sin cerrar la anterior, la sesión
      // nueva pasa a ser la vigente y la anterior queda revocada.
      await tx.sesiones.updateMany({
        where: {
          fid_dispositivos: dispositivo.id_dispositivos,
          estado: 1,
          revocada_en: null,
          expira_en: { gt: tiempos.ahora },
        },
        data: { revocada_en: tiempos.ahora },
      });

      await tx.sesiones.create({
        data: {
          id_sesiones,
          fid_dispositivos: dispositivo.id_dispositivos,
          generacion: 0,
          hash_token_refresco,
          iniciada_en: tiempos.ahora,
          ultimo_uso_en: tiempos.ahora,
          expira_inactividad_en: tiempos.expira_inactividad,
          expira_absoluta_en: tiempos.expira_absoluta,
          expira_en: tiempos.expira_refresco,
          agente_usuario,
          ip,
        },
      });

      // La auditoría participa en la misma transacción: si falla, también se
      // revierten contador, dispositivo y sesión.
      await this.auditarIngreso(
        peticion,
        "exito",
        "correcto",
        usuario.fid_organizaciones,
        usuario.id_usuarios,
        tx,
      );
    });

    return { tokenAcceso, tokenRefresco };
  }

  /** Firma el par de tokens con una ventana calculada previamente por PostgreSQL. */
  private async firmarTokens(
    usuario: UsuarioPublico,
    id_sesiones: string,
    gen: number,
    tiempos: VentanaTemporal,
  ): Promise<TokensEmitidos & { hash_token_refresco: string }> {
    const iat = this.epoch(tiempos.ahora);
    const emisor = this.opcionesEmisor();
    const [tokenRefresco, tokenAcceso] = await Promise.all([
      this.jwt.signAsync(
        {
          sub: usuario.id_usuarios,
          sid: id_sesiones,
          gen, // generación de este token; el refresco compara contra la fila
          iat,
          exp: this.epoch(tiempos.expira_refresco),
        },
        {
          secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
          ...emisor,
        },
      ),
      this.jwt.signAsync(
        {
          sub: usuario.id_usuarios,
          sid: id_sesiones,
          gen,
          fid_organizaciones: usuario.fid_organizaciones,
          usuario: usuario.usuario,
          roles: usuario.roles,
          permisos: usuario.permisos,
          idioma: usuario.idioma,
          iat,
          exp: this.epoch(tiempos.expira_acceso),
        },
        {
          secret: this.config.getOrThrow("JWT_ACCESS_SECRET"),
          ...emisor,
        },
      ),
    ]);
    return {
      tokenAcceso,
      tokenRefresco,
      hash_token_refresco: this.hashTokensRefresco.crear(tokenRefresco),
    };
  }

  // --- refresco (rotación con detección de reuso) -------------------------

  /**
   * Cambio de contraseña ya comprobó la credencial actual. Aquí el refresh raw
   * se vuelve a contrastar con su HMAC y generación en DB antes de rotar ambos JWT.
   */
  async rotarSesionActual(
    id_usuarios: string,
    id_sesiones: string,
    tokenRefrescoRaw: string,
    peticion: ContextoSolicitud,
  ): Promise<TokensEmitidos> {
    const payload = this.jwt.decode<{
      sub?: unknown;
      sid?: unknown;
      gen?: unknown;
    }>(tokenRefrescoRaw);
    const generacion = payload?.gen;
    if (
      !payload ||
      payload.sub !== id_usuarios ||
      payload.sid !== id_sesiones ||
      typeof generacion !== "number" ||
      !Number.isInteger(generacion) ||
      generacion < 0
    ) {
      throw new UnauthorizedException("auth.sessionInvalid");
    }
    return this.refrescar(
      id_usuarios,
      id_sesiones,
      generacion,
      tokenRefrescoRaw,
      peticion,
    );
  }

  async refrescar(
    id_usuarios: string,
    id_sesiones: string,
    gen: number,
    tokenRefrescoRaw: string,
    peticion: ContextoSolicitud,
  ): Promise<TokensEmitidos> {
    try {
      return await this.procesarRefresco(
        id_usuarios,
        id_sesiones,
        gen,
        tokenRefrescoRaw,
        peticion,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;

      const detalle = error instanceof Error ? error.stack : String(error);
      this.logger.error("Fallo inesperado durante el refresco", detalle);
      throw new InternalServerErrorException("auth.refreshProcessingError");
    }
  }

  private async procesarRefresco(
    id_usuarios: string,
    id_sesiones: string,
    gen: number,
    tokenRefrescoRaw: string,
    peticion: ContextoSolicitud,
  ): Promise<TokensEmitidos> {
    const minutosAcceso = Number(
      this.config.getOrThrow("JWT_ACCESS_TTL_MINUTES"),
    );
    const horasRefresco = Number(
      this.config.getOrThrow("JWT_REFRESH_TTL_HOURS"),
    );
    const minutosInactividad = Number(
      this.config.getOrThrow("SESSION_IDLE_TTL_MINUTES"),
    );
    const segundosGracia = Number(
      this.config.getOrThrow("REFRESH_REUSE_GRACE_SECONDS"),
    );

    type ResultadoRefresco =
      | { tipo: "exito"; tokens: TokensEmitidos }
      | { tipo: "reuso" }
      | { tipo: "expirado" | "invalido" };

    const resultado = await this.prisma.$transaction(async (tx) => {
      // FOR UPDATE sobre la ÚNICA fila de esta sesión. El sid no cambia al rotar:
      // la fila se actualiza en sitio. El segundo refresh concurrente espera al
      // primero y observa la generación ya avanzada.
      const [sesion] = await tx.$queryRaw<
        {
          fid_dispositivos: string;
          hash_token_refresco: string;
          generacion: number;
          expira_en: Date;
          expira_inactividad_en: Date;
          expira_absoluta_en: Date;
          rotada_en: Date | null;
          reuso_detectado_en: Date | null;
          revocada_en: Date | null;
          estado: number;
          estado_dispositivo: number;
          fid_usuarios: string;
          fid_organizaciones: string;
          ahora_base: Date;
          dentro_gracia: boolean;
        }[]
      >`
        SELECT
          s.fid_dispositivos,
          s.hash_token_refresco,
          s.generacion,
          s.expira_en,
          s.expira_inactividad_en,
          s.expira_absoluta_en,
          s.rotada_en,
          s.reuso_detectado_en,
          s.revocada_en,
          s.estado,
          d.estado AS estado_dispositivo,
          d.fid_usuarios,
          u.fid_organizaciones,
          CURRENT_TIMESTAMP AS ahora_base,
          COALESCE(
            s.rotada_en + (${segundosGracia} * INTERVAL '1 second') >= CURRENT_TIMESTAMP,
            false
          ) AS dentro_gracia
        FROM seguridad.sesiones s
        INNER JOIN seguridad.dispositivos d
          ON d.id_dispositivos = s.fid_dispositivos
        INNER JOIN seguridad.usuarios u
          ON u.id_usuarios = d.fid_usuarios
        WHERE s.id_sesiones = ${id_sesiones}::uuid
        FOR UPDATE OF s
      `;

      if (!sesion || sesion.fid_usuarios !== id_usuarios) {
        return { tipo: "invalido" } satisfies ResultadoRefresco;
      }

      // Revocada (logout, revocación de admin, o reuso ya detectado) → inválido.
      // No dispara un cierre global adicional.
      if (sesion.revocada_en) {
        return { tipo: "invalido" } satisfies ResultadoRefresco;
      }

      // La generación distingue el token vigente de uno ya rotado.
      if (gen < sesion.generacion) {
        // Justo la anterior y dentro de la gracia = doble-refresh benigno
        // (reintento de red): 401 sin revocar; el cliente ya tiene el token nuevo.
        if (gen === sesion.generacion - 1 && sesion.dentro_gracia) {
          return { tipo: "invalido" } satisfies ResultadoRefresco;
        }
        // Token ya rotado, fuera de gracia → REUSO. Revoca ESTA sesión (mata también
        // el token vigente del atacante) y marca el incidente una sola vez.
        if (!sesion.reuso_detectado_en) {
          await tx.sesiones.updateMany({
            where: { id_sesiones, reuso_detectado_en: null },
            data: {
              reuso_detectado_en: sesion.ahora_base,
              revocada_en: sesion.ahora_base,
            },
          });
          await this.auditoria.registrar(
            {
              accion: "autenticacion.refresco.reuso",
              entidad: "sesiones",
              id_entidad: id_sesiones,
              fid_organizaciones: sesion.fid_organizaciones,
              fid_usuarios: id_usuarios,
              metadatos: {
                motivo: "token_rotado_reutilizado",
                generacion_presentada: gen,
                generacion_vigente: sesion.generacion,
              },
              peticion,
            },
            tx,
          );
        }
        return { tipo: "reuso" } satisfies ResultadoRefresco;
      }
      if (gen > sesion.generacion) {
        // Imposible con tokens emitidos por nosotros → inválido.
        return { tipo: "invalido" } satisfies ResultadoRefresco;
      }

      // gen === generacion: es el token vigente. Verifica HMAC como defensa en
      // profundidad (usa OTRO secreto: un token forjado con el secreto JWT no coincide).
      const tokenValido = await this.hashTokensRefresco.verificar(
        sesion.hash_token_refresco,
        tokenRefrescoRaw,
      );
      if (!tokenValido) {
        return { tipo: "invalido" } satisfies ResultadoRefresco;
      }

      if (
        sesion.estado !== 1 ||
        sesion.estado_dispositivo !== 1 ||
        sesion.expira_en <= sesion.ahora_base ||
        sesion.expira_inactividad_en <= sesion.ahora_base ||
        sesion.expira_absoluta_en <= sesion.ahora_base
      ) {
        return { tipo: "expirado" } satisfies ResultadoRefresco;
      }

      const contexto = await this.contextoUsuarios.obtenerPorUsuario(
        id_usuarios,
        tx,
      );
      if (!contexto) {
        return { tipo: "invalido" } satisfies ResultadoRefresco;
      }

      const tiempos = await this.reloj.ventanaSesionRotada(
        minutosAcceso,
        horasRefresco,
        minutosInactividad,
        sesion.expira_absoluta_en,
        tx,
      );
      const nuevaGen = sesion.generacion + 1;
      const emitidos = await this.firmarTokens(
        {
          id_usuarios: contexto.id_usuarios,
          fid_organizaciones: contexto.fid_organizaciones,
          usuario: contexto.usuario,
          roles: contexto.roles.map((rol) => rol.codigo),
          permisos: contexto.permisos,
          idioma: normalizarIdioma(contexto.preferencias.idioma),
        },
        id_sesiones, // MISMO sid: la sesión persiste, solo rota su token
        nuevaGen,
        tiempos,
      );

      // Rotación IN-PLACE: la misma fila avanza generación, hash y ventanas. El cap
      // absoluto (expira_absoluta_en) NO se toca: la sesión no se prolonga infinito.
      await tx.sesiones.update({
        where: { id_sesiones },
        data: {
          hash_token_refresco: emitidos.hash_token_refresco,
          generacion: nuevaGen,
          rotada_en: tiempos.ahora,
          ultimo_uso_en: tiempos.ahora,
          expira_inactividad_en: tiempos.expira_inactividad,
          expira_en: tiempos.expira_refresco,
        },
      });

      // El dispositivo también avanza su "último acceso" en la rotación, no solo en
      // el login: una sesión mantenida viva por refresh no queda con el dato viejo.
      await tx.dispositivos.update({
        where: { id_dispositivos: sesion.fid_dispositivos },
        data: { ultimo_acceso_en: tiempos.ahora },
      });

      return {
        tipo: "exito",
        tokens: {
          tokenAcceso: emitidos.tokenAcceso,
          tokenRefresco: emitidos.tokenRefresco,
        },
      } satisfies ResultadoRefresco;
    });

    if (resultado.tipo === "exito") return resultado.tokens;
    if (resultado.tipo === "reuso") {
      // La sesión ya quedó revocada en la transacción; expulsa sus conexiones vivas.
      this.eventos.emitir({
        fid_usuarios: id_usuarios,
        tipo: "session_revoked",
        sid: id_sesiones,
      });
    }
    if (resultado.tipo === "expirado") {
      throw new UnauthorizedException("auth.sessionExpired");
    }
    throw new UnauthorizedException("auth.sessionInvalid");
  }

  // --- cerrar sesión ------------------------------------------------------

  async cerrarSesion(
    id_sesiones: string,
    peticion: ContextoSolicitud,
  ): Promise<void> {
    const fid_usuarios = await this.prisma.$transaction(async (tx) => {
      const ahoraBase = await this.reloj.ahora(tx);
      // Trae dispositivo + usuario + organización para poder auditar el cierre.
      const sesion = await tx.sesiones.findUnique({
        where: { id_sesiones },
        select: {
          fid_dispositivos: true,
          dispositivo: {
            select: {
              fid_usuarios: true,
              usuario: { select: { fid_organizaciones: true } },
            },
          },
        },
      });
      if (!sesion) return;

      // Revoca la sesión representada por el refresh token usado en logout.
      // updateMany condicional (revocada_en null) → idempotente: si ya estaba
      // revocada, count = 0 y no se re-audita ni se vuelve a tocar el push.
      const cierre = await tx.sesiones.updateMany({
        where: { id_sesiones, revocada_en: null },
        data: { revocada_en: ahoraBase },
      });
      if (cierre.count !== 1) return;

      // El dispositivo deja de recibir push cuando ya no tiene sesión abierta.
      await tx.dispositivos.update({
        where: { id_dispositivos: sesion.fid_dispositivos },
        data: { firebase_token_fcm: null },
      });

      // Auditoría del cierre en la misma transacción: si falla, se revierte todo.
      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.AUTENTICACION_CIERRE_EXITO.codigo,
          entidad: "sesiones",
          id_entidad: id_sesiones,
          fid_organizaciones: sesion.dispositivo.usuario.fid_organizaciones,
          fid_usuarios: sesion.dispositivo.fid_usuarios,
          metadatos: { motivo: "logout" },
          peticion,
        },
        tx,
      );
      return sesion.dispositivo.fid_usuarios; // el cierre ocurrió → avisar por SSE
    });

    // Fuera de la transacción (ya confirmada): avisa a las conexiones SSE de ESTA
    // sesión (mismo sid) por si algún dispositivo/pestaña quedó abierto sin recibir el
    // BroadcastChannel. Si el cierre no ocurrió, fid_usuarios es undefined y no emite.
    if (fid_usuarios) {
      this.eventos.emitir({
        fid_usuarios,
        tipo: "session_revoked",
        sid: id_sesiones,
      });
    }
  }
}
