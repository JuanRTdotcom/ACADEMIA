import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  CatalogoMotivosConsulta,
  DatosMotivoConsulta,
  FiltrosMotivosConsulta,
} from "../entities/motivo-consulta";

export abstract class RepositorioMotivosConsulta {
  abstract listar(
    organizacion: string,
    filtros: FiltrosMotivosConsulta,
  ): Promise<CatalogoMotivosConsulta>;
  abstract buscar(
    organizacion: string,
    consulta: string,
  ): Promise<CatalogoMotivosConsulta["motivos"]>;
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
