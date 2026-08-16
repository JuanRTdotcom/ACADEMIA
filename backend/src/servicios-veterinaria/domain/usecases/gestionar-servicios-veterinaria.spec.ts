import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { RepositorioServiciosVeterinaria } from "../repositories/repositorio-servicios-veterinaria";
import { CasoUsoGestionarServiciosVeterinaria } from "./gestionar-servicios-veterinaria";

describe("CasoUsoGestionarServiciosVeterinaria", () => {
  it("delega listado paginado y búsqueda dentro del tenant", async () => {
    const listar = jest.fn().mockResolvedValue({ servicios: [] });
    const buscar = jest.fn().mockResolvedValue([]);
    const repositorio = {
      listar,
      buscar,
    } as unknown as RepositorioServiciosVeterinaria;
    const casoUso = new CasoUsoGestionarServiciosVeterinaria(repositorio);

    await casoUso.listar("veterinaria", "sede", { despues_de: "cursor" });
    await casoUso.buscar("veterinaria", "sede", "consulta");

    expect(listar).toHaveBeenCalledWith("veterinaria", "sede", {
      despues_de: "cursor",
    });
    expect(buscar).toHaveBeenCalledWith("veterinaria", "sede", "consulta");
  });

  it("delega la eliminación con el tenant y actor de la sesión", async () => {
    const eliminar = jest.fn().mockResolvedValue(undefined);
    const repositorio = {
      eliminar,
    } as unknown as RepositorioServiciosVeterinaria;
    const casoUso = new CasoUsoGestionarServiciosVeterinaria(repositorio);
    const contexto: ContextoSolicitud = {
      host: "admin.localhost",
      host_reenviado: null,
      ip: "127.0.0.1",
      agente_usuario: "test",
    };

    await casoUso.eliminar(
      "servicio",
      "veterinaria",
      "sede",
      "usuario",
      contexto,
    );

    expect(eliminar).toHaveBeenCalledWith(
      "servicio",
      "veterinaria",
      "sede",
      "usuario",
      contexto,
    );
  });
});
