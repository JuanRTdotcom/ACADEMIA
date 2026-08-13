import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ResultadoCatalogoPaginado } from "../../../comun/domain/entities/catalogo-paginado";
import type { DatosServicioPeluqueriaSpa, FiltrosServiciosPeluqueriaSpa } from "../entities/servicio-peluqueria-spa";

export abstract class RepositorioServiciosPeluqueriaSpa {
  abstract listar(organizacion: string, filtros: FiltrosServiciosPeluqueriaSpa): Promise<ResultadoCatalogoPaginado>;
  abstract buscar(organizacion: string, consulta: string): Promise<unknown>;
  abstract crear(organizacion: string, datos: DatosServicioPeluqueriaSpa, usuario: string, peticion: ContextoSolicitud): Promise<unknown>;
  abstract actualizar(id: string, organizacion: string, datos: DatosServicioPeluqueriaSpa, usuario: string, peticion: ContextoSolicitud): Promise<void>;
  abstract cambiarEstado(id: string, organizacion: string, activo: boolean, usuario: string, peticion: ContextoSolicitud): Promise<void>;
  abstract eliminar(id: string, organizacion: string, usuario: string, peticion: ContextoSolicitud): Promise<void>;
}
