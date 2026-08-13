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
const INVALIDO = { message: "procedures.invalidData" };

export class DtoGuardarProcedimientoVeterinario {
  @IsDefined(INVALIDO)
  @Transform(texto)
  @IsString(INVALIDO)
  @MinLength(2, INVALIDO)
  @MaxLength(160, INVALIDO)
  nombre!: string;

  @IsDefined(INVALIDO)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString(INVALIDO)
  @MinLength(5, INVALIDO)
  @MaxLength(1000, INVALIDO)
  descripcion_guia!: string;
}

export class DtoCambiarEstadoProcedimientoVeterinario {
  @IsDefined(INVALIDO)
  @IsBoolean(INVALIDO)
  activo!: boolean;
}
