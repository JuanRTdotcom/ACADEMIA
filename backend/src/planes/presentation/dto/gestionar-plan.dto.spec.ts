import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DtoGestionarPlan } from "./gestionar-plan.dto";

const base = { codigo: "INICIAL", nombre: "Plan Inicial" };

describe("DtoGestionarPlan: capacidades", () => {
  it("acepta capacidades positivas o ilimitadas", async () => {
    await expect(
      validate(
        plainToInstance(DtoGestionarPlan, {
          ...base,
          almacenamiento_valor: null,
          fid_parametros_unidad_almacenamiento: null,
          maximo_sedes: null,
          maximo_usuarios: null,
          maximo_mensajes_mensuales: null,
          maximo_uso_ia_mensual: null,
        }),
      ),
    ).resolves.toHaveLength(0);
    await expect(
      validate(
        plainToInstance(DtoGestionarPlan, {
          ...base,
          almacenamiento_valor: 512,
          fid_parametros_unidad_almacenamiento:
            "8a000000-0000-4000-8000-000000000001",
          maximo_sedes: 1,
          maximo_usuarios: 3,
          maximo_mensajes_mensuales: 300,
          maximo_uso_ia_mensual: 50,
        }),
      ),
    ).resolves.toHaveLength(0);
  });

  it("rechaza capacidades iguales a cero", async () => {
    const errores = await validate(
      plainToInstance(DtoGestionarPlan, {
        ...base,
        maximo_sedes: 0,
        maximo_usuarios: 0,
        maximo_mensajes_mensuales: 0,
        maximo_uso_ia_mensual: 0,
      }),
    );
    expect(errores.map(({ property }) => property)).toEqual(
      expect.arrayContaining([
        "maximo_sedes",
        "maximo_usuarios",
        "maximo_mensajes_mensuales",
        "maximo_uso_ia_mensual",
      ]),
    );
  });

  it("exige valor y unidad de almacenamiento como una pareja", async () => {
    const sinUnidad = await validate(
      plainToInstance(DtoGestionarPlan, {
        ...base,
        almacenamiento_valor: 500,
      }),
    );
    const sinValor = await validate(
      plainToInstance(DtoGestionarPlan, {
        ...base,
        fid_parametros_unidad_almacenamiento:
          "8a000000-0000-4000-8000-000000000002",
      }),
    );
    expect(sinUnidad.map(({ property }) => property)).toContain(
      "fid_parametros_unidad_almacenamiento",
    );
    expect(sinValor.map(({ property }) => property)).toContain(
      "almacenamiento_valor",
    );
  });
});
