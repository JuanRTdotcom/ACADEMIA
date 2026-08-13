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
const INVALIDO = { message: "vaccines.invalidData" };

export class DtoGuardarVacuna {
  @IsDefined(INVALIDO)
  @Transform(texto)
  @IsString(INVALIDO)
  @MinLength(2, INVALIDO)
  @MaxLength(120, INVALIDO)
  nombre!: string;
}

export class DtoCambiarEstadoVacuna {
  @IsDefined(INVALIDO)
  @IsBoolean(INVALIDO)
  activo!: boolean;
}

export class DtoListarVacunas {
  @IsOptional()
  @IsString({ message: "vaccines.invalidCursor" })
  @MaxLength(1_000, { message: "vaccines.invalidCursor" })
  p?: string;

  @Transform(texto)
  @IsOptional()
  @IsString({ message: "vaccines.invalidSearch" })
  @MinLength(3, { message: "vaccines.invalidSearch" })
  @MaxLength(120, { message: "vaccines.invalidSearch" })
  q?: string;
}

export class DtoBuscarVacunas {
  @Transform(texto)
  @IsString({ message: "vaccines.invalidSearch" })
  @MinLength(3, { message: "vaccines.invalidSearch" })
  @MaxLength(120, { message: "vaccines.invalidSearch" })
  q!: string;
}
