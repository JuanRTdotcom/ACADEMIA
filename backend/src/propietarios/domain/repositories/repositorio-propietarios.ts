import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ResultadoCatalogoPaginado } from "../../../comun/domain/entities/catalogo-paginado";
import type {
  DatosPropietario,
  EliminacionPropietario,
  FiltrosPropietarios,
} from "../entities/propietario";

export abstract class RepositorioPropietarios {
  abstract listar(
    organizacion: string,
    sede: string,
    filtros: FiltrosPropietarios,
  ): Promise<ResultadoCatalogoPaginado>;
  abstract opciones(organizacion: string, sede: string, idioma: string): Promise<unknown>;
  abstract obtener(id: string, organizacion: string): Promise<unknown>;
  abstract crear(
    organizacion: string,
    sede: string,
    datos: DatosPropietario,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<{ id_propietarios: string }>;
  abstract actualizar(
    id: string,
    organizacion: string,
    sede: string,
    datos: DatosPropietario,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract eliminar(
    id: string,
    organizacion: string,
    sede: string,
    datos: EliminacionPropietario,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
}
