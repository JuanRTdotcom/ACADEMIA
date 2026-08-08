import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { ServicioHashTokenRefresco } from "./data/security/hash-token-refresco.service";

describe("ServicioHashTokenRefresco", () => {
  const servicio = new ServicioHashTokenRefresco(
    new ConfigService({
      REFRESH_TOKEN_HASH_SECRET:
        "secreto-de-prueba-independiente-con-mas-de-32-caracteres",
    }),
  );

  it("crea un HMAC determinista y no guarda el token", () => {
    const token = "refresh-token-aleatorio";
    const hash = servicio.crear(token);

    expect(hash).toMatch(/^hmac-sha256:[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(servicio.crear(token)).toBe(hash);
  });

  it("acepta el token correcto y rechaza uno distinto", async () => {
    const hash = servicio.crear("token-correcto");

    await expect(servicio.verificar(hash, "token-correcto")).resolves.toBe(
      true,
    );
    await expect(servicio.verificar(hash, "token-incorrecto")).resolves.toBe(
      false,
    );
  });

  it("mantiene compatibilidad temporal con hashes Argon2 antiguos", async () => {
    const hashAntiguo = await argon2.hash("token-antiguo");

    await expect(
      servicio.verificar(hashAntiguo, "token-antiguo"),
    ).resolves.toBe(true);
    await expect(servicio.verificar(hashAntiguo, "otro-token")).resolves.toBe(
      false,
    );
  });
});
