import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DtoGuardarSede } from "./guardar-sede.dto";

describe("DtoGuardarSede", () => {
  const uuid = "11111111-1111-4111-8111-111111111111";
  const datos = {
    codigo: "LIMA",
    nombre: "Sede Lima",
  };

  it("acepta únicamente nombre y código normalizados", async () => {
    expect(await validate(plainToInstance(DtoGuardarSede, datos))).toHaveLength(
      0,
    );
    const instancia = plainToInstance(DtoGuardarSede, {
      codigo: " lima-2 ",
      nombre: "  Sede   Norte  ",
    });
    expect(await validate(instancia)).toHaveLength(0);
    expect(instancia).toMatchObject({ codigo: "LIMA-2", nombre: "Sede Norte" });
  });

  it("rechaza códigos y nombres inválidos", async () => {
    const errores = await validate(
      plainToInstance(DtoGuardarSede, {
        codigo: "!",
        nombre: "A",
      }),
    );
    expect(errores.map((error) => error.property)).toEqual(
      expect.arrayContaining(["codigo", "nombre"]),
    );
  });

});
