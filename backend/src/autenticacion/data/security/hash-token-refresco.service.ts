import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import * as argon2 from "argon2";

const PREFIJO_HMAC = "hmac-sha256:";

/**
 * Protege refresh tokens de alta entropía antes de guardarlos en PostgreSQL.
 * HMAC es suficiente para tokens aleatorios y evita el coste de Argon2 dentro
 * de la transacción. Argon2 queda únicamente como lector temporal de sesiones
 * creadas antes de esta migración; toda rotación nueva se guarda como HMAC.
 */
@Injectable()
export class ServicioHashTokenRefresco {
  constructor(private config: ConfigService) {}

  crear(token: string): string {
    const secreto = this.config.getOrThrow<string>("REFRESH_TOKEN_HASH_SECRET");
    const resumen = createHmac("sha256", secreto)
      .update(token, "utf8")
      .digest("hex");
    return `${PREFIJO_HMAC}${resumen}`;
  }

  async verificar(hashGuardado: string, token: string): Promise<boolean> {
    if (hashGuardado.startsWith(PREFIJO_HMAC)) {
      const esperado = Buffer.from(this.crear(token), "utf8");
      const recibido = Buffer.from(hashGuardado, "utf8");
      return (
        esperado.length === recibido.length &&
        timingSafeEqual(esperado, recibido)
      );
    }

    // Compatibilidad temporal: las sesiones previas almacenaban Argon2.
    if (hashGuardado.startsWith("$argon2")) {
      return argon2.verify(hashGuardado, token).catch(() => false);
    }

    return false;
  }
}
