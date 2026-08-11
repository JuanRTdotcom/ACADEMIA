import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

const texto = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

export class DtoGuardarVacuna {
  @IsDefined()
  @Transform(texto)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;
}

export class DtoCambiarEstadoVacuna {
  @IsDefined()
  @IsBoolean()
  activo!: boolean;
}
