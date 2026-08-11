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

  @IsOptional()
  @IsInt()
  @Min(1024 * 1024)
  @Max(Number.MAX_SAFE_INTEGER)
  almacenamiento_max_bytes?: number | null;
}

export class DtoActualizarModulosPlan {
  @IsDefined()
  @IsArray()
  @IsUUID("4", { each: true })
  fid_modulos!: string[];
}
