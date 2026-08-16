import { Transform } from "class-transformer";
import {
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsUUID,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from "class-validator";

const texto = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

export class DtoGestionarPlan {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[A-Z0-9_]+$/i)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  codigo!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(texto)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  @Transform(texto)
  descripcion?: string;

  @ValidateIf(
    (dto: DtoGestionarPlan) =>
      dto.fid_parametros_unidad_almacenamiento !== null &&
      dto.fid_parametros_unidad_almacenamiento !== undefined,
  )
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  almacenamiento_valor?: number | null;

  @ValidateIf(
    (dto: DtoGestionarPlan) =>
      dto.almacenamiento_valor !== null &&
      dto.almacenamiento_valor !== undefined,
  )
  @IsUUID("4")
  fid_parametros_unidad_almacenamiento?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maximo_sedes?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maximo_usuarios?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  maximo_mensajes_mensuales?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  maximo_uso_ia_mensual?: number | null;
}

export class DtoActualizarModulosPlan {
  @IsDefined()
  @IsArray()
  @IsUUID("4", { each: true })
  fid_modulos!: string[];
}
