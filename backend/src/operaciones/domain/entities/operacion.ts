import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";

export interface ComandoActor {
  organizacion: string;
  usuario: string;
  sede: string;
  contexto: ContextoSolicitud;
}

export interface FiltrosListadoOperacion {
  q?: string;
  despues_de?: string;
  antes_de?: string;
}

export interface DatosProducto {
  fid_categorias_productos: string | null;
  fid_parametros_tipo: string;
  nombre: string;
  descripcion: string | null;
  sku: string | null;
  codigo_barras: string | null;
  precio_venta: string;
  costo_referencia: string | null;
  stock_minimo: string;
  controla_lotes: boolean;
}

export interface LineaVenta {
  fid_productos: string | null;
  fid_lotes_productos: string | null;
  fid_servicios_veterinaria: string | null;
  cantidad: string;
  precio_unitario: string;
  descuento: string;
}

export interface DatosVenta {
  fid_propietarios: string | null;
  fid_mascotas: string | null;
  fid_atenciones: string | null;
  observaciones: string | null;
  lineas: LineaVenta[];
}

export interface DatosMovimientoInventario {
  fid_productos: string;
  fid_lotes_productos: string | null;
  fid_parametros_tipo: string;
  cantidad: string;
  costo_unitario: string | null;
  observaciones: string | null;
}

export interface DatosLoteProducto {
  fid_productos: string;
  numero_lote: string;
  fecha_vencimiento: string | null;
  costo_unitario: string | null;
  cantidad_inicial: string;
}

export interface DatosPagoVenta {
  fid_ventas: string;
  fid_parametros_metodo: string;
  monto: string;
  referencia: string | null;
}

export interface DatosCita {
  fid_propietarios: string | null;
  fid_mascotas: string | null;
  fid_usuarios_responsable: string | null;
  fid_parametros_estado: string;
  inicia_en: string;
  termina_en: string;
  motivo: string;
  observaciones: string | null;
}

export interface DatosRecordatorio {
  fid_propietarios: string | null;
  fid_mascotas: string;
  fid_parametros_tipo: string;
  fid_parametros_estado: string;
  titulo: string;
  detalle: string | null;
  programado_para: string;
}

export interface DatosDocumentoMascota {
  fid_mascotas: string;
  fid_parametros_tipo: string;
  titulo: string;
  entidad_emisora: string | null;
  realizado_en: string;
  observaciones: string | null;
}

export interface DatosSerieComprobante {
  fid_parametros_tipo: string;
  serie: string;
}

export interface DatosComprobante {
  fid_ventas: string;
  fid_series_comprobante: string;
  fid_parametros_tipo_documento_cliente: string;
  cliente_numero_documento: string;
  cliente_nombre: string;
  cliente_direccion: string | null;
}
