import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DtoCompartirMedioEmpresa } from "./compartir-medio-empresa.dto";

describe("DtoCompartirMedioEmpresa", () => {
  it.each([true, false])("acepta el booleano %s", async (valor) => {
    const errores = await validate(
      plainToInstance(DtoCompartirMedioEmpresa, {
        usar_misma_imagen: valor,
      }),
    );
    expect(errores).toHaveLength(0);
  });

  it.each([undefined, null, "true", 1])(
    "rechaza un valor requerido que no sea booleano: %s",
    async (valor) => {
      const errores = await validate(
        plainToInstance(DtoCompartirMedioEmpresa, {
          usar_misma_imagen: valor,
        }),
      );
      expect(errores.some((error) => error.property === "usar_misma_imagen")).toBe(
        true,
      );
    },
  );
});
