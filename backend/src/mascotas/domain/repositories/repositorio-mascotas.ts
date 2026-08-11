import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  ArchivoMascota,
  DatosMascota,
  FiltrosMascotas,
} from "../entities/mascota";

export abstract class RepositorioMascotas {
  abstract listar(
    organizacion: string,
    filtros: FiltrosMascotas,
    idioma: string,
  ): Promise<unknown>;
  abstract opciones(idioma: string): Promise<unknown>;
  abstract buscarPropietarios(
    organizacion: string,
    q: string,
  ): Promise<unknown>;
  abstract obtener(id: string, organizacion: string): Promise<unknown>;
  abstract obtenerFoto(
    id: string,
    version: string,
    organizacion: string,
  ): Promise<{ contenido: Buffer; tipo_mime: "image/jpeg" }>;
  abstract crear(
    organizacion: string,
    datos: DatosMascota,
    foto: ArchivoMascota | null,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<{ id_mascotas: string }>;
  abstract actualizar(
    id: string,
    organizacion: string,
    datos: DatosMascota,
    foto: ArchivoMascota | null,
    eliminarFoto: boolean,
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
