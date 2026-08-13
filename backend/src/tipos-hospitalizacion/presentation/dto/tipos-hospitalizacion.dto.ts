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
const INVALIDO = { message: "hospitalizationTypes.invalidData" };

export class DtoGuardarTipoHospitalizacion {
  @IsDefined(INVALIDO)
  @Transform(texto)
  @IsString(INVALIDO)
  @MinLength(2, INVALIDO)
  @MaxLength(120, INVALIDO)
  nombre!: string;
}

export class DtoCambiarEstadoTipoHospitalizacion {
  @IsDefined(INVALIDO)
  @IsBoolean(INVALIDO)
  activo!: boolean;
}
