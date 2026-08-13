import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DtoBuscarVacunas, DtoListarVacunas } from "./vacunas.dto";

describe("DTO de catálogo de vacunas", () => {
  it("normaliza una búsqueda válida", async () => {
    const dto = plainToInstance(DtoListarVacunas, { q: "  Triple   felina  " });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.q).toBe("Triple felina");
  });

  it("rechaza búsquedas menores a tres caracteres", async () => {
    expect(
      await validate(plainToInstance(DtoBuscarVacunas, { q: "ab" })),
    ).not.toHaveLength(0);
  });

  it("rechaza posiciones demasiado largas", async () => {
    expect(
      await validate(
        plainToInstance(DtoListarVacunas, { p: "x".repeat(1001) }),
      ),
    ).not.toHaveLength(0);
  });
});
