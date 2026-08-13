import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ResultadoCatalogoPaginado } from "../../../comun/domain/entities/catalogo-paginado";
import type { DatosEstudioDiagnostico, FiltrosEstudiosDiagnosticos } from "../entities/estudio-diagnostico";

export abstract class RepositorioEstudiosDiagnosticos {
  abstract listar(organizacion: string, filtros: FiltrosEstudiosDiagnosticos): Promise<ResultadoCatalogoPaginado>;
  abstract buscar(organizacion: string, consulta: string): Promise<unknown>;
  abstract crear(organizacion: string, datos: DatosEstudioDiagnostico, usuario: string, contexto: ContextoSolicitud): Promise<{ id_estudios_diagnosticos: string; nombre: string }>;
  abstract actualizar(id: string, organizacion: string, datos: DatosEstudioDiagnostico, usuario: string, contexto: ContextoSolicitud): Promise<void>;
  abstract cambiarEstado(id: string, organizacion: string, activo: boolean, usuario: string, contexto: ContextoSolicitud): Promise<void>;
  abstract eliminar(id: string, organizacion: string, usuario: string, contexto: ContextoSolicitud): Promise<void>;
}
