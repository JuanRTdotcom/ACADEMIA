import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosTipoHospitalizacion } from "../entities/tipo-hospitalizacion";

export abstract class RepositorioTiposHospitalizacion {
  abstract listar(organizacion: string): Promise<unknown>;
  abstract crear(
    organizacion: string,
    datos: DatosTipoHospitalizacion,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<{ id_tipos_hospitalizacion: string; nombre: string }>;
  abstract actualizar(
    id: string,
    organizacion: string,
    datos: DatosTipoHospitalizacion,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract cambiarEstado(
    id: string,
    organizacion: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract eliminar(
    id: string,
    organizacion: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
}
