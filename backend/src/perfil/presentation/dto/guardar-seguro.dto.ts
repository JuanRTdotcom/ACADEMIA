import { Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const TEXTO_COMPANIA = /^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u;
const NUMERO_SEGURO = /^[\p{L}\p{N}][\p{L}\p{N}\s./-]*$/u;

export class DtoGuardarSeguro {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[a-z0-9_]+$/)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  codigo_seguro!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(TEXTO_COMPANIA)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value,
  )
  nombre_otro?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(NUMERO_SEGURO)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value,
  )
  numero_seguro!: string;
}
