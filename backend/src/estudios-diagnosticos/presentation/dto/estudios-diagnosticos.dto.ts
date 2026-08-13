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
const INVALIDO = { message: "diagnosticStudies.invalidData" };

export class DtoGuardarEstudioDiagnostico {
  @IsDefined(INVALIDO)
  @Transform(texto)
  @IsString(INVALIDO)
  @MinLength(2, INVALIDO)
  @MaxLength(160, INVALIDO)
  nombre!: string;
}

export class DtoCambiarEstadoEstudioDiagnostico {
  @IsDefined(INVALIDO)
  @IsBoolean(INVALIDO)
  activo!: boolean;
}
