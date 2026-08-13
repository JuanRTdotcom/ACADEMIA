import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioPropietarios } from "../repositories/repositorio-propietarios";
import { CasoUsoGestionarPropietarios } from "./gestionar-propietarios";

describe("CasoUsoGestionarPropietarios", () => {
  it("delega la eliminación con propietario, tenant y actor", async () => {
    const eliminar = jest.fn().mockResolvedValue(undefined);
    const caso = new CasoUsoGestionarPropietarios({
      eliminar,
    } as unknown as RepositorioPropietarios);
    const contexto: ContextoSolicitud = {
      host: "vet.localhost",
      host_reenviado: null,
      ip: "127.0.0.1",
      agente_usuario: "test",
    };
    await caso.eliminar(
      "propietario",
      "veterinaria",
      { confirmar_desvinculacion: true },
      "usuario",
      contexto,
    );
    expect(eliminar).toHaveBeenCalledWith(
      "propietario",
      "veterinaria",
      { confirmar_desvinculacion: true },
      "usuario",
      contexto,
    );
  });
});
