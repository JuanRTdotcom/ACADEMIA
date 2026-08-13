import { Transform, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateNested } from "class-validator";

const limpiar = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const decimal = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,4})?$/;

export class DtoCrearProducto {
  @IsOptional() @IsUUID() fid_categorias_productos?: string;
  @IsUUID() fid_parametros_tipo!: string;
  @Transform(limpiar) @IsString() @MinLength(2) @MaxLength(160) nombre!: string;
  @Transform(limpiar) @IsString() @MaxLength(500) descripcion = "";
  @Transform(limpiar) @IsString() @MaxLength(80) sku = "";
  @Transform(limpiar) @IsString() @MaxLength(80) codigo_barras = "";
  @IsString() @Matches(decimal) precio_venta!: string;
  @IsString() @Matches(/^$|^(?:0|[1-9]\d{0,9})(?:\.\d{1,4})?$/) costo_referencia = "";
  @IsString() @Matches(decimal) stock_minimo = "0";
  @IsBoolean() controla_lotes = false;
}

export class DtoLineaVenta {
  @IsOptional() @IsUUID() fid_productos?: string;
  @IsOptional() @IsUUID() fid_lotes_productos?: string;
  @IsOptional() @IsUUID() fid_servicios_veterinaria?: string;
  @IsString() @Matches(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/) cantidad!: string;
  @IsString() @Matches(decimal) precio_unitario!: string;
  @IsString() @Matches(decimal) descuento = "0";
}

export class DtoCrearVenta {
  @IsOptional() @IsUUID() fid_propietarios?: string;
  @IsOptional() @IsUUID() fid_mascotas?: string;
  @IsOptional() @IsUUID() fid_atenciones?: string;
  @Transform(limpiar) @IsString() @MaxLength(500) observaciones = "";
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => DtoLineaVenta) lineas!: DtoLineaVenta[];
}

export class DtoCrearMovimientoInventario {
  @IsUUID() fid_productos!: string;
  @IsOptional() @IsUUID() fid_lotes_productos?: string;
  @IsUUID() fid_parametros_tipo!: string;
  @IsString() @Matches(/^-?(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/) cantidad!: string;
  @IsString() @Matches(/^$|^(?:0|[1-9]\d{0,9})(?:\.\d{1,4})?$/) costo_unitario = "";
  @Transform(limpiar) @IsString() @MaxLength(500) observaciones = "";
}

export class DtoCrearLoteProducto {
  @IsUUID() fid_productos!: string;
  @Transform(limpiar) @IsString() @MinLength(1) @MaxLength(100) numero_lote!: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha_vencimiento?: string;
  @IsString() @Matches(/^$|^(?:0|[1-9]\d{0,9})(?:\.\d{1,4})?$/) costo_unitario = "";
  @IsString() @Matches(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/) cantidad_inicial!: string;
}

export class DtoCrearPagoVenta {
  @IsUUID() fid_ventas!: string;
  @IsUUID() fid_parametros_metodo!: string;
  @IsString() @Matches(decimal) monto!: string;
  @Transform(limpiar) @IsString() @MaxLength(120) referencia = "";
}

export class DtoCrearCita {
  @IsOptional() @IsUUID() fid_propietarios?: string;
  @IsOptional() @IsUUID() fid_mascotas?: string;
  @IsOptional() @IsUUID() fid_usuarios_responsable?: string;
  @IsUUID() fid_parametros_estado!: string;
  @IsISO8601({ strict: true }) inicia_en!: string;
  @IsISO8601({ strict: true }) termina_en!: string;
  @Transform(limpiar) @IsString() @MinLength(2) @MaxLength(250) motivo!: string;
  @Transform(limpiar) @IsString() @MaxLength(500) observaciones = "";
}

export class DtoCrearRecordatorio {
  @IsOptional() @IsUUID() fid_propietarios?: string;
  @IsUUID() fid_mascotas!: string;
  @IsUUID() fid_parametros_tipo!: string;
  @IsUUID() fid_parametros_estado!: string;
  @Transform(limpiar) @IsString() @MinLength(2) @MaxLength(160) titulo!: string;
  @Transform(limpiar) @IsString() @MaxLength(500) detalle = "";
  @IsISO8601({ strict: true }) programado_para!: string;
}

export class DtoCrearDocumentoMascota {
  @IsUUID() fid_mascotas!: string;
  @IsUUID() fid_parametros_tipo!: string;
  @Transform(limpiar) @IsString() @MinLength(2) @MaxLength(180) titulo!: string;
  @Transform(limpiar) @IsString() @MaxLength(180) entidad_emisora = "";
  @IsISO8601({ strict: true }) realizado_en!: string;
  @Transform(limpiar) @IsString() @MaxLength(500) observaciones = "";
}

export class DtoCrearSerieComprobante {
  @IsUUID() fid_parametros_tipo!: string;
  @Transform(({ value }) => typeof value === "string" ? value.trim().toUpperCase() : value) @IsString() @Matches(/^[A-Z0-9]{4}$/) serie!: string;
}

export class DtoPrepararComprobante {
  @IsUUID() fid_ventas!: string;
  @IsUUID() fid_series_comprobante!: string;
  @IsUUID() fid_parametros_tipo_documento_cliente!: string;
  @Transform(limpiar) @IsString() @MinLength(1) @MaxLength(20) cliente_numero_documento!: string;
  @Transform(limpiar) @IsString() @MinLength(2) @MaxLength(200) cliente_nombre!: string;
  @Transform(limpiar) @IsString() @MaxLength(250) cliente_direccion = "";
}

export class DtoRangoCitas { @IsOptional() @IsISO8601({ strict: true }) desde?: string; @IsOptional() @IsISO8601({ strict: true }) hasta?: string; }
export class DtoFiltroRecordatorio { @IsOptional() @IsUUID() mascota?: string; }
