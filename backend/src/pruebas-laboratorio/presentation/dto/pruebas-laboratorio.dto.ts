import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

const texto = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const INVALIDO = { message: "laboratoryTests.invalidData" };

export class DtoGuardarPruebaLaboratorio {
  @IsDefined(INVALIDO)
  @IsUUID("4", INVALIDO)
  fid_categorias_pruebas_laboratorio!: string;

  @IsDefined(INVALIDO)
  @Transform(texto)
  @IsString(INVALIDO)
  @MinLength(2, INVALIDO)
  @MaxLength(220, INVALIDO)
  nombre!: string;
}

export class DtoCambiarEstadoPruebaLaboratorio {
  @IsDefined(INVALIDO)
  @IsBoolean(INVALIDO)
  activo!: boolean;
}
