import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DtoCrearUsuario } from "./guardar-usuario.dto";

const valido = {
  fid_organizaciones: "11111111-1111-4111-8111-111111111111",
  usuario: "DOCTORA1",
  nombres: "Ana",
  apellido_paterno: "Pérez",
  apellido_materno: "Ruiz",
  correo: "ana@veterinaria.com",
  fid_roles: ["22222222-2222-4222-8222-222222222222"],
  fid_permisos: ["33333333-3333-4333-8333-333333333333"],
  contrasenia_temporal: "Temporal1!",
  confirmacion_contrasenia: "Temporal1!",
};

describe("DtoCrearUsuario: permisos efectivos", () => {
  it("acepta permisos UUID únicos", async () => {
    expect(await validate(plainToInstance(DtoCrearUsuario, valido))).toHaveLength(0);
  });

  it("rechaza permisos duplicados o con identificadores inválidos", async () => {
    const errores = await validate(
      plainToInstance(DtoCrearUsuario, {
        ...valido,
        fid_permisos: ["invalido", valido.fid_permisos[0], valido.fid_permisos[0]],
      }),
    );
    expect(errores.some((error) => error.property === "fid_permisos")).toBe(true);
  });
});
