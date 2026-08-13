import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DtoCambiarEstadoServicioVeterinaria } from "./cambiar-estado-servicio-veterinaria.dto";

describe("DtoCambiarEstadoServicioVeterinaria", () => {
  it.each([true, false])("acepta el booleano %s", async (activo) => {
    const dto = plainToInstance(DtoCambiarEstadoServicioVeterinaria, {
      activo,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([undefined, null, 1, "true"])(
    "rechaza el valor %s",
    async (activo) => {
      const dto = plainToInstance(DtoCambiarEstadoServicioVeterinaria, {
        activo,
      });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );
});
