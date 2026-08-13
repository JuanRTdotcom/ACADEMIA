import type {
  ComandoActor,
  DatosCita,
  DatosComprobante,
  DatosDocumentoMascota,
  DatosMovimientoInventario,
  DatosLoteProducto,
  DatosPagoVenta,
  DatosProducto,
  DatosRecordatorio,
  DatosSerieComprobante,
  DatosVenta,
  FiltrosListadoOperacion,
} from "../entities/operacion";
import type { ResultadoCatalogoPaginado } from "../../../comun/domain/entities/catalogo-paginado";

export abstract class RepositorioOperaciones {
  abstract obtenerFichaMascota(id: string, organizacion: string, idioma: string): Promise<unknown>;
  abstract listarCatalogos(organizacion: string, idioma: string): Promise<unknown>;
  abstract listarProductos(organizacion: string, filtros: FiltrosListadoOperacion): Promise<ResultadoCatalogoPaginado>;
  abstract crearProducto(datos: DatosProducto, actor: ComandoActor): Promise<unknown>;
  abstract crearVenta(datos: DatosVenta, actor: ComandoActor): Promise<unknown>;
  abstract crearMovimientoInventario(datos: DatosMovimientoInventario, actor: ComandoActor): Promise<unknown>;
  abstract crearLoteProducto(datos: DatosLoteProducto, actor: ComandoActor): Promise<unknown>;
  abstract crearPagoVenta(datos: DatosPagoVenta, actor: ComandoActor): Promise<unknown>;
  abstract listarVentas(organizacion: string, filtros: FiltrosListadoOperacion): Promise<ResultadoCatalogoPaginado>;
  abstract listarCitas(organizacion: string, desde?: string, hasta?: string): Promise<unknown>;
  abstract crearCita(datos: DatosCita, actor: ComandoActor): Promise<unknown>;
  abstract listarRecordatorios(organizacion: string, mascota?: string): Promise<unknown>;
  abstract crearRecordatorio(datos: DatosRecordatorio, actor: ComandoActor): Promise<unknown>;
  abstract crearDocumentoMascota(datos: DatosDocumentoMascota, actor: ComandoActor): Promise<unknown>;
  abstract obtenerResumen(organizacion: string): Promise<unknown>;
  abstract listarComprobantes(organizacion: string, filtros: FiltrosListadoOperacion): Promise<ResultadoCatalogoPaginado>;
  abstract crearSerie(datos: DatosSerieComprobante, actor: ComandoActor): Promise<unknown>;
  abstract prepararComprobante(datos: DatosComprobante, actor: ComandoActor): Promise<unknown>;
}
