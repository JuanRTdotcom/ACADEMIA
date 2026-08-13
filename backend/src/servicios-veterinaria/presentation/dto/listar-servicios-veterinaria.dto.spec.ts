import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  DtoBuscarServiciosVeterinaria,
  DtoListarServiciosVeterinaria,
} from "./listar-servicios-veterinaria.dto";

describe("DTO de consulta de servicios veterinarios", () => {
  it("acepta un token opaco de página", async () => {
    const dto = plainToInstance(DtoListarServiciosVeterinaria, {
      p: "v1.posicion.cifrada.firma",
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it("rechaza tokens excesivamente largos", async () => {
    const dto = plainToInstance(DtoListarServiciosVeterinaria, {
      p: "a".repeat(1_001),
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it("normaliza la búsqueda del listado", async () => {
    const dto = plainToInstance(DtoListarServiciosVeterinaria, {
      q: "  vacunación  ",
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.q).toBe("vacunación");
  });

  it("normaliza y valida la búsqueda remota", async () => {
    const dto = plainToInstance(DtoBuscarServiciosVeterinaria, {
      q: "  consulta general  ",
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.q).toBe("consulta general");
  });

  it("espera al menos tres caracteres antes de buscar", async () => {
    const dto = plainToInstance(DtoBuscarServiciosVeterinaria, { q: "ba" });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
