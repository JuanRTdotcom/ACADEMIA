import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const texto = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const INVALIDO = { message: "common.invalidPagination" };

export class DtoListarCatalogoPaginado {
  @IsOptional()
  @IsString(INVALIDO)
  @MaxLength(1000, INVALIDO)
  p?: string;

  @IsOptional()
  @Transform(texto)
  @IsString(INVALIDO)
  @MinLength(3, INVALIDO)
  @MaxLength(220, INVALIDO)
  q?: string;
}

export class DtoBuscarCatalogo {
  @Transform(texto)
  @IsString(INVALIDO)
  @MinLength(3, INVALIDO)
  @MaxLength(220, INVALIDO)
  q!: string;
}
