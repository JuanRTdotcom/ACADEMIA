import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosMotivoConsulta } from "../entities/motivo-consulta";

export abstract class RepositorioMotivosConsulta {
  abstract listar(organizacion: string): Promise<unknown>;
  abstract crear(
    organizacion: string,
    datos: DatosMotivoConsulta,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<{
    id_motivos_consulta: string;
    nombre: string;
    descripcion: string | null;
  }>;
  abstract actualizar(
    id: string,
    organizacion: string,
    datos: DatosMotivoConsulta,
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
