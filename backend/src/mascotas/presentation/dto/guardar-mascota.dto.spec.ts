import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DtoGuardarMascota } from "./guardar-mascota.dto";

const valido = {
  fid_propietarios: "10000000-0000-4000-8000-000000000001",
  sin_propietario: "false",
  animal_servicio: "false",
  apoyo_emocional: "true",
  eliminar_foto: "false",
  nombre: "Luna",
  codigo_chip: "985141000123456",
  fid_especies_animales: "10000000-0000-4000-8000-000000000002",
  fid_subespecies_animales: "10000000-0000-4000-8000-000000000003",
  fid_parametros_genero: "10000000-0000-4000-8000-000000000004",
  fid_parametros_color: "10000000-0000-4000-8000-000000000009",
  fecha_nacimiento: "2022-04-15",
  peso: "8.250",
  fid_parametros_unidad_peso: "10000000-0000-4000-8000-000000000005",
  fid_parametros_talla: "10000000-0000-4000-8000-000000000006",
  fid_parametros_estado_reproductivo: "10000000-0000-4000-8000-000000000007",
  fid_parametros_temperamento: "10000000-0000-4000-8000-000000000008",
  alimento: "Alimento seco",
};

describe("DtoGuardarMascota", () => {
  it("acepta el formulario multipart válido y transforma booleanos", async () => {
    const dto = plainToInstance(DtoGuardarMascota, valido);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.animal_servicio).toBe(false);
    expect(dto.apoyo_emocional).toBe(true);
    expect(dto.eliminar_foto).toBe(false);
  });

  it("acepta una mascota sin propietario", async () => {
    const dto = plainToInstance(DtoGuardarMascota, {
      ...valido,
      fid_propietarios: "",
      sin_propietario: "true",
      codigo_chip: "",
      alimento: "",
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.fid_propietarios).toBeUndefined();
  });

  it("acepta solo nombre, decisión de dueño, especie y género", async () => {
    const dto = plainToInstance(DtoGuardarMascota, {
      nombre: "Luna",
      fid_propietarios: "",
      sin_propietario: "true",
      fid_especies_animales: valido.fid_especies_animales,
      fid_parametros_genero: valido.fid_parametros_genero,
      codigo_chip: "",
      fid_parametros_color: "",
      fecha_nacimiento: "",
      peso: "",
      fid_parametros_unidad_peso: "",
      fid_parametros_talla: "",
      fid_parametros_estado_reproductivo: "",
      fid_parametros_temperamento: "",
      alimento: "",
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rechaza peso, fecha y referencias inválidas", async () => {
    const dto = plainToInstance(DtoGuardarMascota, {
      ...valido,
      peso: "-2",
      fecha_nacimiento: "15/04/2022",
      fid_especies_animales: "canino",
    });
    const campos = (await validate(dto)).map((error) => error.property);
    expect(campos).toEqual(
      expect.arrayContaining([
        "peso",
        "fecha_nacimiento",
        "fid_especies_animales",
      ]),
    );
  });
});
