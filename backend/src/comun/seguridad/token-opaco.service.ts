import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const VERSION = "v1";

@Injectable()
export class ServicioTokenOpaco {
  private readonly clave: Buffer;

  constructor(configuracion: ConfigService) {
    this.clave = Buffer.from(
      hkdfSync(
        "sha256",
        configuracion.getOrThrow<string>("JWT_ACCESS_SECRET"),
        "sumaq-token-opaco",
        "aes-256-gcm-v1",
        32,
      ),
    );
  }

  cifrar(ambito: string, contenido: Record<string, unknown>): string {
    const nonce = randomBytes(12);
    const cifrador = createCipheriv(ALGORITMO, this.clave, nonce);
    cifrador.setAAD(Buffer.from(`${VERSION}:${ambito}`));
    const cifrado = Buffer.concat([
      cifrador.update(JSON.stringify(contenido), "utf8"),
      cifrador.final(),
    ]);
    return [VERSION, nonce, cifrado, cifrador.getAuthTag()]
      .map((parte) =>
        typeof parte === "string" ? parte : parte.toString("base64url"),
      )
      .join(".");
  }

  descifrar<T extends object>(
    ambito: string,
    token: string,
  ): T | null {
    try {
      const [version, nonce, cifrado, etiqueta, adicional] = token.split(".");
      if (
        version !== VERSION ||
        !nonce ||
        !cifrado ||
        !etiqueta ||
        adicional ||
        token.length > 1_000
      ) {
        return null;
      }
      const descifrador = createDecipheriv(
        ALGORITMO,
        this.clave,
        Buffer.from(nonce, "base64url"),
      );
      descifrador.setAAD(Buffer.from(`${VERSION}:${ambito}`));
      descifrador.setAuthTag(Buffer.from(etiqueta, "base64url"));
      const contenido = JSON.parse(
        Buffer.concat([
          descifrador.update(Buffer.from(cifrado, "base64url")),
          descifrador.final(),
        ]).toString("utf8"),
      ) as T;
      if (typeof contenido !== "object" || contenido === null) return null;
      return contenido;
    } catch {
      return null;
    }
  }
}
