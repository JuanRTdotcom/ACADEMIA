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

export class DtoGuardarMotivoConsulta {
  @IsDefined()
  @Transform(texto)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;
  @IsDefined()
  @Transform(texto)
  @IsString()
  @MaxLength(500)
  descripcion!: string;
}

export class DtoCambiarEstadoMotivoConsulta {
  @IsDefined()
  @IsBoolean()
  activo!: boolean;
}
