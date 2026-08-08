import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoRegistrarCliente } from "../entities/comando-registrar-cliente";

export abstract class RepositorioDispositivos {
  abstract registrarCliente(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoRegistrarCliente,
    contexto: ContextoSolicitud,
  ): Promise<{ actualizado: boolean }>;

  abstract registrarTokenPush(
    idUsuario: string,
    uidDispositivo: string,
    tokenFcm: string,
  ): Promise<{ actualizado: boolean }>;
}
