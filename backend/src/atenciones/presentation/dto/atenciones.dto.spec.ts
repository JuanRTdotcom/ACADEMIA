import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { randomUUID } from "node:crypto";
import { DtoCrearAtencion, DtoRegistroAtencion } from "./atenciones.dto";

describe("DtoCrearAtencion", () => {
  it("transforma y valida el registro JSON recibido por multipart", async () => {
    const mascota = randomUUID();
    const tipo = randomUUID();
    const motivo = randomUUID();
    const dto = plainToInstance(DtoCrearAtencion, {
      fid_mascotas: mascota,
      registro: JSON.stringify({
        fid_tipos_registro_atencion: tipo,
        detalle: { fid_motivos_consulta: motivo },
      }),
    });

    expect(dto.registro).toBeInstanceOf(DtoRegistroAtencion);
    await expect(
      validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).resolves.toHaveLength(0);
  });

  it("rechaza un registro multipart que no contiene JSON válido", async () => {
    const dto = plainToInstance(DtoCrearAtencion, {
      fid_mascotas: randomUUID(),
      registro: "registro-invalido",
    });

    expect(
      await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).not.toHaveLength(0);
  });
});
