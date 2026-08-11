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

export class DtoGuardarProcedimientoVeterinario {
  @IsDefined()
  @Transform(texto)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre!: string;

  @IsDefined()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  descripcion_guia!: string;
}

export class DtoCambiarEstadoProcedimientoVeterinario {
  @IsDefined()
  @IsBoolean()
  activo!: boolean;
}
