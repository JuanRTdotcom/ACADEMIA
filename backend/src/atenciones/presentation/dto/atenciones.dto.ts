import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
const booleano = ({ value }: { value: unknown }) => {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return value;
};
const json = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed;
  } catch {
    return value;
  }
};

export class DtoListarAtenciones {
  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @Transform(booleano)
  @IsBoolean()
  incluir_ayer?: boolean;
}

export class DtoBuscarPropietariosAtencion {
  @Transform(limpiar)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  q!: string;
}

export class DtoRegistroAtencion {
  @IsUUID("4")
  fid_tipos_registro_atencion!: string;

  @Transform(json)
  @IsObject()
  detalle!: Record<string, unknown>;
}

export class DtoCrearAtencion {
  @IsUUID("4")
  fid_mascotas!: string;

  @Transform(json)
  @ValidateNested()
  @Type(() => DtoRegistroAtencion)
  registro!: DtoRegistroAtencion;
}

export class DtoCambiarEstadoAtencion {
  @IsUUID("4")
  fid_parametros_estado!: string;
}
