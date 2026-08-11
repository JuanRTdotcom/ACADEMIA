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

export class DtoGuardarPruebaLaboratorio {
  @IsDefined()
  @IsUUID("4")
  fid_categorias_pruebas_laboratorio!: string;

  @IsDefined()
  @Transform(texto)
  @IsString()
  @MinLength(2)
  @MaxLength(220)
  nombre!: string;
}

export class DtoCambiarEstadoPruebaLaboratorio {
  @IsDefined()
  @IsBoolean()
  activo!: boolean;
}
