import { Injectable } from "@nestjs/common";
import type { ComandoActor, DatosCita, DatosComprobante, DatosDocumentoMascota, DatosLoteProducto, DatosMovimientoInventario, DatosPagoVenta, DatosProducto, DatosRecordatorio, DatosSerieComprobante, DatosVenta, FiltrosListadoOperacion } from "../../domain/entities/operacion";
import { RepositorioOperaciones } from "../../domain/repositories/repositorio-operaciones";
import { FuenteDatosOperacionesPrisma } from "../datasources/operaciones-prisma.datasource";

@Injectable()
export class RepositorioOperacionesDatos implements RepositorioOperaciones {
  constructor(private fuente: FuenteDatosOperacionesPrisma) {}
  obtenerFichaMascota(id: string, organizacion: string, idioma: string) { return this.fuente.obtenerFichaMascota(id, organizacion, idioma); }
  listarCatalogos(organizacion: string, idioma: string) { return this.fuente.listarCatalogos(organizacion, idioma); }
  listarProductos(organizacion: string, filtros: FiltrosListadoOperacion) { return this.fuente.listarProductos(organizacion, filtros); }
  crearProducto(datos: DatosProducto, actor: ComandoActor) { return this.fuente.crearProducto(datos, actor); }
  crearVenta(datos: DatosVenta, actor: ComandoActor) { return this.fuente.crearVenta(datos, actor); }
  crearMovimientoInventario(datos: DatosMovimientoInventario, actor: ComandoActor) { return this.fuente.crearMovimientoInventario(datos, actor); }
  crearLoteProducto(datos: DatosLoteProducto, actor: ComandoActor) { return this.fuente.crearLoteProducto(datos, actor); }
  crearPagoVenta(datos: DatosPagoVenta, actor: ComandoActor) { return this.fuente.crearPagoVenta(datos, actor); }
  listarVentas(organizacion: string, filtros: FiltrosListadoOperacion) { return this.fuente.listarVentas(organizacion, filtros); }
  listarCitas(organizacion: string, desde?: string, hasta?: string) { return this.fuente.listarCitas(organizacion, desde, hasta); }
  crearCita(datos: DatosCita, actor: ComandoActor) { return this.fuente.crearCita(datos, actor); }
  listarRecordatorios(organizacion: string, mascota?: string) { return this.fuente.listarRecordatorios(organizacion, mascota); }
  crearRecordatorio(datos: DatosRecordatorio, actor: ComandoActor) { return this.fuente.crearRecordatorio(datos, actor); }
  crearDocumentoMascota(datos: DatosDocumentoMascota, actor: ComandoActor) { return this.fuente.crearDocumentoMascota(datos, actor); }
  obtenerResumen(organizacion: string) { return this.fuente.obtenerResumen(organizacion); }
  listarComprobantes(organizacion: string, filtros: FiltrosListadoOperacion) { return this.fuente.listarComprobantes(organizacion, filtros); }
  crearSerie(datos: DatosSerieComprobante, actor: ComandoActor) { return this.fuente.crearSerie(datos, actor); }
  prepararComprobante(datos: DatosComprobante, actor: ComandoActor) { return this.fuente.prepararComprobante(datos, actor); }
}
