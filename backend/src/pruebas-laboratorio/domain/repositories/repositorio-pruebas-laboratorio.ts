import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ResultadoCatalogoPaginado } from "../../../comun/domain/entities/catalogo-paginado";
import type { DatosPruebaLaboratorio, FiltrosPruebasLaboratorio } from "../entities/prueba-laboratorio";

export abstract class RepositorioPruebasLaboratorio {
  abstract listar(organizacion: string, filtros: FiltrosPruebasLaboratorio): Promise<ResultadoCatalogoPaginado>;
  abstract buscar(organizacion: string, consulta: string): Promise<unknown>;
  abstract crear(
    organizacion: string,
    datos: DatosPruebaLaboratorio,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<{ id_pruebas_laboratorio: string; nombre: string }>;
  abstract actualizar(
    id: string,
    organizacion: string,
    datos: DatosPruebaLaboratorio,
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
