import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { ServicioTokenOpaco } from "../../../comun/seguridad/token-opaco.service";
import { CasoUsoGestionarServiciosVeterinaria } from "../../domain/usecases/gestionar-servicios-veterinaria";
import { ControladorServiciosVeterinaria } from "./servicios-veterinaria.controller";

describe("ControladorServiciosVeterinaria - paginación opaca", () => {
  const organizacion = "3bfab781-1a04-4675-a621-6cba0ee64a53";
  const cursor = "e0cc20cf-3f2e-44ef-8c66-f538d53a0778";
  const usuario = { fid_organizaciones: organizacion } as UsuarioAutenticado;
  const tokens = new ServicioTokenOpaco(
    new ConfigService({ JWT_ACCESS_SECRET: "a".repeat(64) }),
  );

  it("oculta la posición y la recupera solo para el mismo tenant", async () => {
    const listar = jest.fn().mockResolvedValue({
      servicios: [],
      moneda: {},
      total: 20,
      paginacion: { anterior: null, siguiente: cursor },
    });
    const controlador = new ControladorServiciosVeterinaria(
      { listar } as unknown as CasoUsoGestionarServiciosVeterinaria,
      tokens,
    );

    const primera = await controlador.listar({}, usuario);
    expect(primera.paginacion.siguiente).not.toContain(cursor);

    await controlador.listar({ p: primera.paginacion.siguiente! }, usuario);
    expect(listar).toHaveBeenLastCalledWith(organizacion, {
      despues_de: cursor,
      antes_de: undefined,
      consulta: undefined,
    });

    await expect(
      controlador.listar({ p: primera.paginacion.siguiente! }, {
        fid_organizaciones: "aa7e101d-d668-4e5c-bcf4-76a946e75f82",
      } as UsuarioAutenticado),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
