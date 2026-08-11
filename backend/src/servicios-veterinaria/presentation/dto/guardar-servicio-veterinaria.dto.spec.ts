import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DtoGuardarServicioVeterinaria } from "./guardar-servicio-veterinaria.dto";

describe("DtoGuardarServicioVeterinaria", () => {
  it("normaliza texto y acepta un precio monetario exacto", async () => {
    const dto = plainToInstance(DtoGuardarServicioVeterinaria, {
      nombre: "  Consulta   general ",
      descripcion: " Atención de rutina ",
      precio: "45.50",
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toEqual({
      nombre: "Consulta general",
      descripcion: "Atención de rutina",
      precio: "45.50",
    });
  });

  it("acepta los campos opcionales vacíos", async () => {
    const dto = plainToInstance(DtoGuardarServicioVeterinaria, {
      nombre: "Baño",
      descripcion: "  ",
      precio: "",
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.descripcion).toBe("");
    expect(dto.precio).toBe("");
  });

  it("rechaza precios negativos o con más de dos decimales", async () => {
    const dto = plainToInstance(DtoGuardarServicioVeterinaria, {
      nombre: "Vacunación",
      descripcion: "",
      precio: "10.999",
    });

    expect(
      (await validate(dto)).some((error) => error.property === "precio"),
    ).toBe(true);
  });
});
