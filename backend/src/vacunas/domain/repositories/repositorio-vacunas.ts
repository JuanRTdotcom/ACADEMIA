import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  CatalogoVacunas,
  DatosVacuna,
  FiltrosVacunas,
} from "../entities/vacuna";

export abstract class RepositorioVacunas {
  abstract listar(
    organizacion: string,
    filtros: FiltrosVacunas,
  ): Promise<CatalogoVacunas>;
  abstract buscar(organizacion: string, consulta: string): Promise<unknown[]>;
  abstract crear(
    organizacion: string,
    datos: DatosVacuna,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<{ id_vacunas: string; nombre: string }>;
  abstract actualizar(
    id: string,
    organizacion: string,
    datos: DatosVacuna,
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
