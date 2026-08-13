import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  DtoBuscarMotivosConsulta,
  DtoListarMotivosConsulta,
} from "./motivos-consulta.dto";

describe("DTO de consulta de motivos de consulta", () => {
  it("acepta un token opaco de página", async () => {
    const dto = plainToInstance(DtoListarMotivosConsulta, {
      p: "v1.posicion.cifrada.firma",
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rechaza tokens excesivamente largos", async () => {
    const dto = plainToInstance(DtoListarMotivosConsulta, {
      p: "a".repeat(1_001),
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it("normaliza la búsqueda del listado", async () => {
    const dto = plainToInstance(DtoListarMotivosConsulta, {
      q: "  consulta general  ",
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.q).toBe("consulta general");
  });

  it("normaliza y valida la búsqueda remota", async () => {
    const dto = plainToInstance(DtoBuscarMotivosConsulta, {
      q: "  control preventivo  ",
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.q).toBe("control preventivo");
  });

  it("espera al menos tres caracteres antes de buscar", async () => {
    const dto = plainToInstance(DtoBuscarMotivosConsulta, { q: "co" });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
