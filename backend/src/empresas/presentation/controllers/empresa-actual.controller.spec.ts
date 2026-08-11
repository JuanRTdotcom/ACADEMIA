import { ForbiddenException } from "@nestjs/common";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { ControladorEmpresaActual } from "./empresa-actual.controller";

const usuario = (permisos: string[]) =>
  ({ fid_organizaciones: "tenant-1", permisos }) as UsuarioAutenticado;

describe("ControladorEmpresaActual", () => {
  const empresa = { seccion: jest.fn() };
  const controlador = new ControladorEmpresaActual(empresa as never);

  beforeEach(() => jest.clearAllMocks());

  it("rechaza leer una sección sin el permiso de su módulo", () => {
    expect(() => controlador.seccion("agenda", usuario([]))).toThrow(
      ForbiddenException,
    );
    expect(empresa.seccion).not.toHaveBeenCalled();
  });

  it("solo entrega la sección cuando el rol aporta su permiso", () => {
    empresa.seccion.mockReturnValue({ agenda_activa: true });

    expect(
      controlador.seccion(
        "agenda",
        usuario(["administrator.company.agenda.read"]),
      ),
    ).toEqual({ agenda_activa: true });
    expect(empresa.seccion).toHaveBeenCalledWith("tenant-1", "agenda");
  });
});
