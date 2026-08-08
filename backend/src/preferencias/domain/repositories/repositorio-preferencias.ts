import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoActualizarPreferencias } from "../entities/comando-actualizar-preferencias";
import type { PreferenciasUsuario } from "../entities/preferencias-usuario";

export abstract class RepositorioPreferencias {
  abstract obtener(idUsuario: string): Promise<PreferenciasUsuario>;
  abstract actualizar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoActualizarPreferencias,
    contexto: ContextoSolicitud,
  ): Promise<PreferenciasUsuario>;
}
