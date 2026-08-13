import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class DtoListarServiciosVeterinaria {
  @IsOptional()
  @IsString({ message: "services.invalidCursor" })
  @MaxLength(1_000, { message: "services.invalidCursor" })
  p?: string;

  @Transform(limpiar)
  @IsOptional()
  @IsString({ message: "services.invalidSearch" })
  @MinLength(3, { message: "services.invalidSearch" })
  @MaxLength(120, { message: "services.invalidSearch" })
  q?: string;
}

export class DtoBuscarServiciosVeterinaria {
  @Transform(limpiar)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  q!: string;
}
