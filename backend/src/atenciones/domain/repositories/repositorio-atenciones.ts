import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ResultadoCatalogoPaginado } from "../../../comun/domain/entities/catalogo-paginado";
import type {
  DatosCrearAtencion,
  DatosEditarRegistroAtencion,
  DatosRegistroAtencion,
  ArchivoAdjuntoAtencion,
  EliminacionAtencion,
  FiltrosAtenciones,
} from "../entities/atencion";

export abstract class RepositorioAtenciones {
  abstract validarAccesoSede(
    id: string,
    organizacion: string,
    sede: string,
  ): Promise<void>;
  abstract listarHoy(
    organizacion: string,
    sede: string,
    filtros: FiltrosAtenciones,
    idioma: string,
  ): Promise<ResultadoCatalogoPaginado>;
  abstract opciones(organizacion: string, idioma: string): Promise<unknown>;
  abstract buscarPropietarios(
    organizacion: string,
    sede: string,
    q: string,
  ): Promise<unknown>;
  abstract mascotasPropietario(
    organizacion: string,
    sede: string,
    propietario: string,
    idioma: string,
  ): Promise<unknown>;
  abstract ultimoRegistroMascota(
    organizacion: string,
    sede: string,
    mascota: string,
    tipo: string,
  ): Promise<unknown>;
  abstract historialMascota(
    organizacion: string,
    sede: string,
    mascota: string,
    idioma: string,
  ): Promise<unknown>;
  abstract obtener(
    id: string,
    organizacion: string,
    idioma: string,
  ): Promise<unknown>;
  abstract crear(
    organizacion: string,
    sede: string,
    datos: DatosCrearAtencion,
    adjuntos: ArchivoAdjuntoAtencion[],
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<{ id_atenciones: string }>;
  abstract agregarRegistro(
    id: string,
    organizacion: string,
    datos: DatosRegistroAtencion,
    adjuntos: ArchivoAdjuntoAtencion[],
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<{ id_registros_atencion: string }>;
  abstract editarRegistro(
    id: string,
    registro: string,
    organizacion: string,
    datos: DatosEditarRegistroAtencion,
    adjuntos: ArchivoAdjuntoAtencion[],
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract cambiarEstado(
    id: string,
    organizacion: string,
    estado: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract obtenerAdjunto(
    id: string,
    registro: string,
    adjunto: string,
    organizacion: string,
  ): Promise<{
    contenido: Buffer;
    nombre: string;
    tipoMime: string;
    checksum: string;
  }>;
  abstract eliminarRegistro(
    id: string,
    registro: string,
    organizacion: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract eliminar(
    id: string,
    organizacion: string,
    datos: EliminacionAtencion,
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
}
