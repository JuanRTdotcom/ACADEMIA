import { Module } from "@nestjs/common";
import { FuenteDatosOperacionesPrisma } from "./data/datasources/operaciones-prisma.datasource";
import { RepositorioOperacionesDatos } from "./data/repositories/repositorio-operaciones.impl";
import { RepositorioOperaciones } from "./domain/repositories/repositorio-operaciones";
import { CasoUsoCrearCita, CasoUsoCrearDocumentoMascota, CasoUsoCrearLoteProducto, CasoUsoCrearMovimientoInventario, CasoUsoCrearPagoVenta, CasoUsoCrearProducto, CasoUsoCrearRecordatorio, CasoUsoCrearSerieComprobante, CasoUsoCrearVenta, CasoUsoListarCatalogosOperacion, CasoUsoListarCitas, CasoUsoListarComprobantes, CasoUsoListarProductos, CasoUsoListarRecordatorios, CasoUsoListarVentas, CasoUsoObtenerFichaMascota, CasoUsoObtenerResumenOperacion, CasoUsoPrepararComprobante } from "./domain/usecases/operaciones.usecases";
import { ControladorFacturacionElectronica, ControladorOperaciones } from "./presentation/controllers/operaciones.controller";
import { ModuloTokenOpaco } from "../comun/seguridad/token-opaco.module";

const casos = [CasoUsoObtenerFichaMascota, CasoUsoListarCatalogosOperacion, CasoUsoListarProductos, CasoUsoCrearProducto, CasoUsoCrearLoteProducto, CasoUsoCrearMovimientoInventario, CasoUsoListarVentas, CasoUsoCrearVenta, CasoUsoCrearPagoVenta, CasoUsoListarCitas, CasoUsoCrearCita, CasoUsoListarRecordatorios, CasoUsoCrearRecordatorio, CasoUsoCrearDocumentoMascota, CasoUsoObtenerResumenOperacion, CasoUsoListarComprobantes, CasoUsoCrearSerieComprobante, CasoUsoPrepararComprobante];

@Module({ imports: [ModuloTokenOpaco], controllers: [ControladorOperaciones, ControladorFacturacionElectronica], providers: [FuenteDatosOperacionesPrisma, RepositorioOperacionesDatos, { provide: RepositorioOperaciones, useExisting: RepositorioOperacionesDatos }, ...casos] })
export class ModuloOperaciones {}
