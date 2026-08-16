import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  CatalogoServiciosVeterinaria,
  DatosServicioVeterinaria,
  FiltrosServiciosVeterinaria,
} from "../entities/servicio-veterinaria";

export abstract class RepositorioServiciosVeterinaria {
  abstract listar(
    organizacion: string,
    sede: string,
    filtros: FiltrosServiciosVeterinaria,
  ): Promise<CatalogoServiciosVeterinaria>;
  abstract buscar(
    organizacion: string,
    sede: string,
    consulta: string,
  ): Promise<CatalogoServiciosVeterinaria["servicios"]>;
  abstract obtener(
    id: string,
    organizacion: string,
    sede: string,
  ): Promise<{
    servicio: CatalogoServiciosVeterinaria["servicios"][number];
    moneda: CatalogoServiciosVeterinaria["moneda"];
  }>;
  abstract crear(
    organizacion: string,
    sede: string,
    datos: DatosServicioVeterinaria,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract actualizar(
    id: string,
    organizacion: string,
    sede: string,
    datos: DatosServicioVeterinaria,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract cambiarEstado(
    id: string,
    organizacion: string,
    sede: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract eliminar(
    id: string,
    organizacion: string,
    sede: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
}
