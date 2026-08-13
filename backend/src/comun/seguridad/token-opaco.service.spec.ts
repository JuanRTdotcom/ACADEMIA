import { ConfigService } from "@nestjs/config";
import { ServicioTokenOpaco } from "./token-opaco.service";

describe("ServicioTokenOpaco", () => {
  const servicio = new ServicioTokenOpaco(
    new ConfigService({ JWT_ACCESS_SECRET: "a".repeat(64) }),
  );

  it("cifra el contenido y rechaza alteraciones o ámbitos distintos", () => {
    const token = servicio.cifrar("services.pagination", {
      id: "e0cc20cf-3f2e-44ef-8c66-f538d53a0778",
    });

    expect(token).not.toContain("e0cc20cf");
    expect(servicio.descifrar("services.pagination", token)).toEqual({
      id: "e0cc20cf-3f2e-44ef-8c66-f538d53a0778",
    });
    expect(servicio.descifrar("otro.ambito", token)).toBeNull();
    expect(
      servicio.descifrar(
        "services.pagination",
        `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`,
      ),
    ).toBeNull();
  });
});
