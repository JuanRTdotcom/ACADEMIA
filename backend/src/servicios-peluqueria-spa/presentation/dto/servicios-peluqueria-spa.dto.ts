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
const INVALIDO = { message: "groomingServices.invalidData" };
export class DtoGuardarServicioPeluqueriaSpa {
  @IsDefined(INVALIDO)
  @Transform(texto)
  @IsString(INVALIDO)
  @MinLength(2, INVALIDO)
  @MaxLength(160, INVALIDO)
  nombre!: string;
}
export class DtoCambiarEstadoServicioPeluqueriaSpa {
  @IsDefined(INVALIDO) @IsBoolean(INVALIDO) activo!: boolean;
}
