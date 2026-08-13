import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DtoBuscarCatalogo, DtoListarCatalogoPaginado } from "./catalogo-paginado.dto";

describe("DTO de catálogo paginado", () => {
  it("acepta una búsqueda de tres caracteres y un token opaco", async () => {
    const dto = plainToInstance(DtoListarCatalogoPaginado, { q: "  rayos   x ", p: "token-opaco" });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.q).toBe("rayos x");
  });

  it("rechaza búsquedas menores de tres caracteres", async () => {
    const dto = plainToInstance(DtoBuscarCatalogo, { q: "ab" });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
