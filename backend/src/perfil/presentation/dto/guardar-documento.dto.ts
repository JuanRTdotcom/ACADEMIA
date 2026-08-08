import { Transform } from "class-transformer";
import {
  IsDefined,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class DtoGuardarDocumento {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[a-z0-9_]+$/)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  codigo_tipo_documento!: string;

  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9 .\-/]*$/)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string"
      ? value.trim().replace(/\s+/g, " ").toUpperCase()
      : value,
  )
  numero_documento!: string;
}
