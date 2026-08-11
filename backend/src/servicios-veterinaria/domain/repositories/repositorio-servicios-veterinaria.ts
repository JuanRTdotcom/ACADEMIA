import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  CatalogoServiciosVeterinaria,
  DatosServicioVeterinaria,
} from "../entities/servicio-veterinaria";

export abstract class RepositorioServiciosVeterinaria {
  abstract listar(organizacion: string): Promise<CatalogoServiciosVeterinaria>;
  abstract obtener(
    id: string,
    organizacion: string,
  ): Promise<{
    servicio: CatalogoServiciosVeterinaria["servicios"][number];
    moneda: CatalogoServiciosVeterinaria["moneda"];
  }>;
  abstract crear(
    organizacion: string,
    datos: DatosServicioVeterinaria,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract actualizar(
    id: string,
    organizacion: string,
    datos: DatosServicioVeterinaria,
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
