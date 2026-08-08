import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ContextoUsuario } from "../../domain/entities/tipos";
import type { ComandoIngreso } from "../entities/comando-ingreso";
import type { TokensEmitidos } from "../entities/resultado-autenticacion";

/** Contrato que aplicación necesita; implementación técnica queda afuera. */
export abstract class RepositorioAutenticacion {
  abstract ingresar(
    comando: ComandoIngreso,
    contexto: ContextoSolicitud,
  ): Promise<TokensEmitidos & { usuario: ContextoUsuario }>;

  abstract refrescar(
    idUsuario: string,
    idSesion: string,
    generacion: number,
    tokenRefresco: string,
    contexto: ContextoSolicitud,
  ): Promise<TokensEmitidos>;

  abstract rotarSesionActual(
    idUsuario: string,
    idSesion: string,
    tokenRefresco: string,
    contexto: ContextoSolicitud,
  ): Promise<TokensEmitidos>;

  abstract cerrarSesion(
    idSesion: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
}
