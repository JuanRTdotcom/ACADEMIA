import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DtoGuardarPropietario } from "./guardar-propietario.dto";

const uuid = "123e4567-e89b-42d3-a456-426614174000";
const valido = {
  fid_parametros_tipo_documento: uuid,
  numero_documento: " 12345678 ",
  nombre_completo: " Ana   Pérez ",
  celular: "+51 999 888 777",
  celular_verificado: true,
  sin_correo: false,
  correo: "ana@example.com",
  correo_verificado: false,
  telefono_fijo: "",
  direccion: "Av. Central 123",
  fid_admin_level_0: uuid,
  fid_admin_level_3: uuid,
  contacto_alternativo_nombre: "",
  contacto_alternativo_telefono: "",
  fid_parametros_como_conocio: uuid,
  como_conocio_otro: "",
};

describe("DtoGuardarPropietario", () => {
  it("normaliza y acepta un propietario completo", async () => {
    const dto = plainToInstance(DtoGuardarPropietario, valido);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.nombre_completo).toBe("Ana Pérez");
  });

  it("acepta la ausencia explícita de correo", async () => {
    const dto = plainToInstance(DtoGuardarPropietario, {
      ...valido,
      sin_correo: true,
      correo: "",
      correo_verificado: false,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("acepta únicamente los campos de identificación", async () => {
    const dto = plainToInstance(DtoGuardarPropietario, {
      fid_parametros_tipo_documento: uuid,
      numero_documento: "12345678",
      nombre_completo: "Ana Pérez",
      celular: "",
      correo: "",
      telefono_fijo: "",
      direccion: "",
      fid_admin_level_0: "",
      fid_admin_level_3: "",
      contacto_alternativo_nombre: "",
      contacto_alternativo_telefono: "",
      fid_parametros_como_conocio: "",
      como_conocio_otro: "",
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rechaza correo inválido y booleanos que no sean reales", async () => {
    const dto = plainToInstance(DtoGuardarPropietario, {
      ...valido,
      correo: "no-es-correo",
      celular_verificado: "true",
    });
    const errores = await validate(dto);
    expect(errores.some((item) => item.property === "correo")).toBe(true);
    expect(errores.some((item) => item.property === "celular_verificado")).toBe(
      true,
    );
  });
});
