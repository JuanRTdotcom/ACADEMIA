import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosProcedimientoVeterinario } from "../entities/procedimiento-veterinario";

export abstract class RepositorioProcedimientosVeterinarios {
  abstract listar(organizacion: string): Promise<unknown>;
  abstract crear(
    organizacion: string,
    datos: DatosProcedimientoVeterinario,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<{ id_procedimientos_veterinarios: string; nombre: string }>;
  abstract actualizar(
    id: string,
    organizacion: string,
    datos: DatosProcedimientoVeterinario,
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
