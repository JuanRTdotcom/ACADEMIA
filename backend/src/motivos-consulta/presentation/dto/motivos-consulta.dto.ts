import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

const texto = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const INVALIDO = { message: "consultationReasons.invalidData" };

export class DtoGuardarMotivoConsulta {
  @IsDefined(INVALIDO)
  @Transform(texto)
  @IsString(INVALIDO)
  @MinLength(2, INVALIDO)
  @MaxLength(120, INVALIDO)
  nombre!: string;
  @IsDefined(INVALIDO)
  @Transform(texto)
  @IsString(INVALIDO)
  @MaxLength(500, INVALIDO)
  descripcion!: string;
}

export class DtoCambiarEstadoMotivoConsulta {
  @IsDefined(INVALIDO)
  @IsBoolean(INVALIDO)
  activo!: boolean;
}

export class DtoListarMotivosConsulta {
  @IsOptional()
  @IsString({ message: "consultationReasons.invalidCursor" })
  @MaxLength(1_000, { message: "consultationReasons.invalidCursor" })
  p?: string;

  @Transform(texto)
  @IsOptional()
  @IsString({ message: "consultationReasons.invalidSearch" })
  @MinLength(3, { message: "consultationReasons.invalidSearch" })
  @MaxLength(120, { message: "consultationReasons.invalidSearch" })
  q?: string;
}

export class DtoBuscarMotivosConsulta {
  @Transform(texto)
  @IsString({ message: "consultationReasons.invalidSearch" })
  @MinLength(3, { message: "consultationReasons.invalidSearch" })
  @MaxLength(120, { message: "consultationReasons.invalidSearch" })
  q!: string;
}
