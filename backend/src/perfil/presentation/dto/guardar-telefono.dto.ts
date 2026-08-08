import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

export class DtoGuardarTelefono {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[a-z0-9_]+$/)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  codigo_tipo_telefono!: string;

  @IsDefined()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  @Matches(/^\+?[0-9][0-9\s().-]*$/)
  @Transform(limpiar)
  numero!: string;

  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[\p{L}\p{N}][\p{L}\p{N}\s.'-]*$/u)
  @Transform(limpiar)
  titular!: string;

  @IsDefined()
  @IsBoolean()
  es_emergencia!: boolean;
}
